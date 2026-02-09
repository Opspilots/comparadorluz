
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { supabase } from '@/shared/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/shared/lib/utils';
import { Progress } from '@/shared/components/ui/progress';

interface TariffUploadDialogProps {
    companyId: string;
    onUploadSuccess?: () => void;
}

interface UploadState {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
}

export function TariffUploadDialog({ companyId, onUploadSuccess }: TariffUploadDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [uploads, setUploads] = useState<UploadState[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Mutation to create a batch
    const createBatchMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from('tariff_batches')
                .insert({
                    company_id: companyId,
                    uploaded_by: (await supabase.auth.getUser()).data.user?.id,
                    status: 'processing',
                    file_count: uploads.length
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                progress: 0,
                status: 'pending' as const
            }));
            setUploads(prev => [...prev, ...newFiles]);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setUploads(prev => prev.filter((_, i) => i !== index));
    };

    const startUpload = async () => {
        if (uploads.length === 0) return;

        try {
            // 1. Create Batch
            const batch = await createBatchMutation.mutateAsync();

            // 2. Upload files and create records
            const uploadPromises = uploads.map(async (uploadState, index) => {
                try {
                    setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'uploading', progress: 0 } : u));

                    const fileExt = uploadState.file.name.split('.').pop();
                    const fileName = `${companyId}/${batch.id}/${crypto.randomUUID()}.${fileExt}`;

                    // Upload to Storage
                    const { error: uploadError } = await supabase.storage
                        .from('tariff-pdfs')
                        .upload(fileName, uploadState.file);

                    if (uploadError) throw uploadError;

                    setUploads(prev => prev.map((u, i) => i === index ? { ...u, progress: 50 } : u));

                    // Create DB record
                    const { data: fileRecord, error: dbError } = await supabase
                        .from('tariff_files')
                        .insert({
                            company_id: companyId,
                            batch_id: batch.id,
                            filename: uploadState.file.name,
                            storage_path: fileName,
                            file_size_bytes: uploadState.file.size,
                            mime_type: uploadState.file.type,
                            extraction_status: 'pending'
                        })
                        .select()
                        .single();

                    if (dbError) throw dbError;

                    setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'processing', progress: 75 } : u));

                    // Trigger Edge Function
                    const { error: funcError } = await supabase.functions.invoke('process-tariff-sheet', {
                        body: {
                            company_id: companyId,
                            file_path: fileName,
                            file_id: fileRecord.id, // Pass ID to update status on completion
                            batch_id: batch.id
                        }
                    });

                    if (funcError) {
                        console.error("Edge function error:", funcError);
                        // Don't fail the whole upload if just the OCR fails, but mark it
                        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'AI Processing Failed', progress: 100 } : u));
                    } else {
                        setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'completed', progress: 100 } : u));
                    }

                } catch (err: any) {
                    console.error("Upload failed for file:", uploadState.file.name, err);
                    setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: err.message } : u));
                }
            });

            await Promise.all(uploadPromises);

            toast({
                title: "Upload Complete",
                description: `Processed ${uploads.length} files.`,
            });

            onUploadSuccess?.();
            setIsOpen(false);
            setUploads([]);
            queryClient.invalidateQueries({ queryKey: ['tariff-batches'] });

        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error creating batch",
                description: err.message
            });
        }
    };

    const isUploading = createBatchMutation.isPending || uploads.some(u => u.status === 'uploading' || u.status === 'processing');

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Tarifas
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Subir Nuevas Tarifas</DialogTitle>
                    <DialogDescription>
                        Sube hojas de tarifas en PDF. La IA intentará extraer los precios automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer",
                            isUploading && "opacity-50 pointer-events-none"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="application/pdf"
                            multiple
                            onChange={handleFileSelect}
                        />
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Upload className="h-8 w-8" />
                            <p className="text-sm font-medium">Haz clic para seleccionar PDFs</p>
                            <p className="text-xs">Máximo 10MB por archivo</p>
                        </div>
                    </div>

                    {uploads.length > 0 && (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {uploads.map((upload, index) => (
                                <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-md border text-sm">
                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-1">
                                            <span className="truncate font-medium">{upload.file.name}</span>
                                            <span className="text-xs text-slate-500 capitalize">{upload.status}</span>
                                        </div>
                                        <Progress value={upload.progress} className="h-1.5" />
                                        {upload.error && (
                                            <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                                        )}
                                    </div>
                                    {!isUploading && (
                                        <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {upload.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                    {(upload.status === 'uploading' || upload.status === 'processing') && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
                        Cancelar
                    </Button>
                    <Button onClick={startUpload} disabled={uploads.length === 0 || isUploading}>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            'Iniciar Subida'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
