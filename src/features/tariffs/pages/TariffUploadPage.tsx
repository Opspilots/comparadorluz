import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { createBatch, uploadBatchFile, finalizeBatch, BatchFileStatus } from '../lib/batch-upload';

export default function TariffUploadPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [files, setFiles] = useState<BatchFileStatus[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get current user and company
    const { data: userData } = useQuery({
        queryKey: ['current-user-full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('users')
                .select('id, company_id')
                .eq('id', user.id)
                .single();
            return data;
        }
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const addFiles = useCallback((newFiles: File[]) => {
        const fileStatuses: BatchFileStatus[] = newFiles.map(file => ({
            file,
            status: 'pending'
        }));
        setFiles(prev => [...prev, ...fileStatuses]);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type === 'application/pdf'
        );

        if (droppedFiles.length !== e.dataTransfer.files.length) {
            toast({
                title: "Archivos ignorados",
                description: "Solo se permiten archivos PDF.",
                variant: "destructive"
            });
        }

        addFiles(droppedFiles);
    }, [addFiles, toast]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.type === 'application/pdf'
            );
            addFiles(selectedFiles);
        }
    };



    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        // ... (existing checks)

        setIsUploading(true);
        try {
            // 1. Create Batch
            const batchId = await createBatch(userData!.company_id, userData!.id);

            // 2. Upload Files 
            // ... (existing loop)
            const newFilesState = [...files];
            for (let i = 0; i < newFilesState.length; i++) {
                newFilesState[i].status = 'uploading';
                setFiles([...newFilesState]);

                try {
                    await uploadBatchFile(batchId, userData!.company_id, newFilesState[i].file);
                    newFilesState[i].status = 'completed';
                } catch (err: unknown) {
                    newFilesState[i].status = 'error';
                    newFilesState[i].error = err instanceof Error ? err.message : String(err);
                }
                setFiles([...newFilesState]);
            }

            // 3. Finalize Batch
            const successCount = newFilesState.filter(f => f.status === 'completed').length;
            await finalizeBatch(batchId, successCount);

            // 4. Trigger real OCR processing via Edge Function for each uploaded file
            // Fetch file records from the batch to get storage paths and file IDs
            const { data: batchFiles } = await supabase
                .from('tariff_files')
                .select('id, file_path')
                .eq('batch_id', batchId);

            if (batchFiles) {
                for (const bf of batchFiles) {
                    supabase.functions.invoke('process-tariff-sheet', {
                        body: { file_path: bf.file_path, file_id: bf.id }
                    }).catch(err => console.error('OCR processing error:', err));
                }
            }

            toast({
                title: "Subida completada y procesamiento iniciado",
                description: `${successCount} archivos subidos. El OCR se está ejecutando en segundo plano.`
            });

            // Redirect to batch details
            setTimeout(() => navigate(`/admin/tariffs/batches/${batchId}`), 1000);

        } catch (error: unknown) {
            // ... (error handling)
        } finally {
            setIsUploading(false);
        }
    };

    if (!userData) return null;

    return (
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                        padding: '0.5rem 1rem', background: 'transparent', border: 'none',
                        cursor: 'pointer', color: '#111827'
                    }}
                >
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                    Volver
                </button>

            </div>

            <div
                style={{
                    border: '2px dashed',
                    borderColor: isDragging ? '#3b82f6' : '#d1d5db',
                    backgroundColor: isDragging ? '#eff6ff' : 'transparent',
                    borderRadius: '0.5rem',
                    padding: '3rem',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    cursor: 'default'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '9999px' }}>
                        <Upload size={32} style={{ color: '#6b7280' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>Arrastra tus archivos PDF aquí</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>o haz clic para seleccionar</p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f3f4f6', color: '#1f2937',
                            border: '1px solid #e5e7eb', cursor: isUploading ? 'not-allowed' : 'pointer',
                            opacity: isUploading ? 0.5 : 1
                        }}
                    >
                        Seleccionar Archivos
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: '2rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {files.map((fileStatus, index) => (
                            <div key={index} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem', backgroundColor: 'white', border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                    <FileText size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem', fontWeight: 500 }}>{fileStatus.file.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({(fileStatus.file.size / 1024).toFixed(0)} KB)</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {fileStatus.status === 'uploading' && <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />}
                                    {fileStatus.status === 'completed' && <CheckCircle size={20} style={{ color: '#22c55e' }} />}
                                    {fileStatus.status === 'error' && <AlertCircle size={20} style={{ color: '#ef4444' }} />}

                                    {fileStatus.status === 'pending' && !isUploading && (
                                        <button
                                            onClick={() => removeFile(index)}
                                            style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleUpload}
                            disabled={isUploading || files.length === 0}
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                                padding: '0.5rem 2rem', width: '100%',
                                backgroundColor: '#2563eb', color: 'white', border: 'none',
                                cursor: (isUploading || files.length === 0) ? 'not-allowed' : 'pointer',
                                opacity: (isUploading || files.length === 0) ? 0.7 : 1
                            }}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                                    Subiendo...
                                </>
                            ) : (
                                `Subir ${files.length} Archivos`
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
