
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useToast } from '@/hooks/use-toast';
// We will use a fixed overlay/modal approach instead of shadcn Dialog to remove dependencies
import { useEffect } from 'react';

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
                    const { data: extractedDataResponse, error: funcError } = await supabase.functions.invoke('process-tariff-sheet', {
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
                        // Handle potential array response (even if edge function returns single object, we wrap it, but it should return array now)
                        const extractedDataArray = Array.isArray(extractedDataResponse) ? extractedDataResponse : [extractedDataResponse];

                        try {
                            for (const extractedData of extractedDataArray) {
                                // Find supplier and structure
                                const { data: suppliers } = await supabase.from('suppliers').select('id, name');
                                const supplierNameLower = (extractedData.supplier_name || '').toLowerCase();
                                let supplierId = null;
                                if (suppliers) {
                                    const match = suppliers.find(s => s.name.toLowerCase().includes(supplierNameLower) || supplierNameLower.includes(s.name.toLowerCase()));
                                    if (match) supplierId = match.id;
                                    else if (suppliers.length > 0) supplierId = suppliers[0].id; // Fallback
                                }

                                const { data: structures } = await supabase.from('tariff_structures').select('id, code, energy_periods, power_periods');
                                let structureId = null;
                                let isGas = false;
                                if (structures) {
                                    const match = structures.find(s => s.code === extractedData.tariff_structure);
                                    if (match) {
                                        structureId = match.id;
                                        isGas = match.code.startsWith('RL');
                                    } else {
                                        // Better fallback strategy
                                        const supplyType = extractedData.supply_type || (extractedData.tariff_structure?.startsWith('RL') ? 'gas' : 'electricity');
                                        isGas = supplyType === 'gas';
                                        const fallbackCode = isGas ? 'RL.1' : '2.0TD';
                                        const fallback = structures.find(s => s.code === fallbackCode);
                                        if (fallback) structureId = fallback.id;
                                        else if (structures.length > 0) structureId = structures[0].id;
                                    }
                                }

                                const validFrom = extractedData.valid_from || new Date().toISOString();

                                const payload = {
                                    company_id: companyId,
                                    batch_id: batch.id,
                                    file_id: fileRecord.id,
                                    supplier_id: supplierId,
                                    tariff_structure_id: structureId,
                                    tariff_name: extractedData.tariff_name || 'Tarifa Importada',
                                    tariff_type: extractedData.tariff_structure || (isGas ? 'RL.1' : '2.0TD'),
                                    is_indexed: extractedData.is_indexed || false,
                                    contract_duration: extractedData.contract_duration || null,
                                    valid_from: validFrom,
                                    valid_to: extractedData.valid_to || null,
                                    is_active: true
                                };

                                // Create or update Tariff Version from Extracted Data
                                let versionCheckQuery = supabase
                                    .from('tariff_versions')
                                    .select('id')
                                    .eq('company_id', payload.company_id)
                                    .eq('supplier_id', payload.supplier_id)
                                    .eq('tariff_structure_id', payload.tariff_structure_id)
                                    .ilike('tariff_name', payload.tariff_name)
                                    .eq('valid_from', payload.valid_from);

                                if (payload.contract_duration === null || payload.contract_duration === undefined) {
                                    versionCheckQuery = versionCheckQuery.is('contract_duration', null);
                                } else {
                                    versionCheckQuery = versionCheckQuery.eq('contract_duration', payload.contract_duration);
                                }

                                const { data: existingVersion, error: existingError } = await versionCheckQuery.maybeSingle();

                                if (existingError && existingError.code !== 'PGRST116') {
                                    throw existingError;
                                }

                                let tariffVersion;
                                let tvError;

                                if (existingVersion) {
                                    const { data: updatedVersion, error: updateError } = await supabase
                                        .from('tariff_versions')
                                        .update(payload)
                                        .eq('id', existingVersion.id)
                                        .select()
                                        .single();
                                    tariffVersion = updatedVersion;
                                    tvError = updateError;
                                } else {
                                    const { data: insertedVersion, error: insertError } = await supabase
                                        .from('tariff_versions')
                                        .insert(payload)
                                        .select()
                                        .single();
                                    tariffVersion = insertedVersion;
                                    tvError = insertError;
                                }

                                if (tvError) throw tvError;

                                // Clean existing rates before inserting new ones to avoid duplicate entries when overwriting
                                await supabase.from('tariff_rates').delete().eq('tariff_version_id', tariffVersion.id);

                                const rates = [];

                                // Energy Prices
                                if (isGas) {
                                    // Gas only has one energy price (P1)
                                    const val = extractedData.energy_p1;
                                    if (val !== null && val !== undefined) {
                                        rates.push({
                                            tariff_version_id: tariffVersion.id,
                                            item_type: 'energy',
                                            period: 'P1',
                                            price: Number(val),
                                            unit: 'EUR/kWh',
                                            contract_duration: payload.contract_duration,
                                            valid_from: payload.valid_from,
                                            valid_to: payload.valid_to
                                        });
                                    }
                                } else {
                                    // Electricity P1-P6
                                    for (let p = 1; p <= 6; p++) {
                                        const val = extractedData[`energy_p${p}`];
                                        if (val !== null && val !== undefined) {
                                            rates.push({
                                                tariff_version_id: tariffVersion.id,
                                                item_type: 'energy',
                                                period: `P${p}`,
                                                price: Number(val),
                                                unit: 'EUR/kWh',
                                                contract_duration: payload.contract_duration,
                                                valid_from: payload.valid_from,
                                                valid_to: payload.valid_to
                                            });
                                        }
                                    }
                                }

                                // Power Prices (Electricity Only)
                                if (!isGas) {
                                    for (let p = 1; p <= 6; p++) {
                                        const val = extractedData[`power_p${p}`];
                                        if (val !== null && val !== undefined) {
                                            rates.push({
                                                tariff_version_id: tariffVersion.id,
                                                item_type: 'power',
                                                period: `P${p}`,
                                                price: Number(val),
                                                unit: 'EUR/kW/month',
                                                contract_duration: payload.contract_duration,
                                                valid_from: payload.valid_from,
                                                valid_to: payload.valid_to
                                            });
                                        }
                                    }
                                }

                                // Fixed Fee (Shared but often Gas specialized)
                                if (extractedData.fixed_fee !== null && extractedData.fixed_fee !== undefined) {
                                    rates.push({
                                        tariff_version_id: tariffVersion.id,
                                        item_type: 'fixed_fee',
                                        period: 'P1',
                                        price: Number(extractedData.fixed_fee),
                                        unit: 'EUR/month',
                                        contract_duration: payload.contract_duration,
                                        valid_from: payload.valid_from,
                                        valid_to: payload.valid_to
                                    });
                                }

                                if (rates.length > 0) {
                                    const { error: cError } = await supabase
                                        .from('tariff_rates')
                                        .insert(rates);

                                    if (cError) throw cError;
                                }
                            }

                            setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'completed', progress: 100 } : u));

                        } catch (creationError: unknown) {
                            console.error("Error creating tariff from data:", creationError);
                            setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'Import Failed', progress: 100 } : u));
                        }
                    }
                } catch (err: unknown) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    console.error("Upload failed for file:", uploadState.file.name, err);
                    setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: 'error', error: errorMsg } : u));
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
            queryClient.invalidateQueries({ queryKey: ['tariff-versions'] });

        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            toast({
                variant: "destructive",
                title: "Error creating batch",
                description: errorMsg
            });
        }
    };

    const isUploading = createBatchMutation.isPending || uploads.some(u => u.status === 'uploading' || u.status === 'processing');

    // Escape key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUploading) setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isUploading]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                    padding: '0.5rem 1rem', backgroundColor: '#111827', color: 'white',
                    border: 'none', cursor: 'pointer'
                }}
            >
                <Upload size={16} style={{ marginRight: '0.5rem' }} />
                Subir Tarifas
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '0.5rem', width: '100%', maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        position: 'relative', overflow: 'hidden'
                    }} role="dialog" aria-modal="true">

                        <div style={{ padding: '1.5rem', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, lineHeight: 1 }}>Subir Nuevas Tarifas</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.375rem' }}>
                                Sube hojas de tarifas en PDF. La IA intentará extraer los precios automáticamente.
                            </p>
                        </div>

                        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                            <div className="grid gap-4 py-4">
                                <div
                                    style={{
                                        border: '2px dashed #e5e7eb', borderRadius: '0.5rem', padding: '2rem',
                                        textAlign: 'center', transition: 'background-color 0.2s',
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        opacity: isUploading ? 0.5 : 1,
                                        backgroundColor: '#f9fafb'
                                    }}
                                    onMouseEnter={(e) => { if (!isUploading) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                    onMouseLeave={(e) => { if (!isUploading) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="application/pdf"
                                        multiple
                                        onChange={handleFileSelect}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                        <Upload size={32} />
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Haz clic para seleccionar PDFs</p>
                                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Máximo 10MB por archivo</p>
                                    </div>
                                </div>

                                {uploads.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {uploads.map((upload, index) => (
                                            <div key={index} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem',
                                                border: '1px solid #e2e8f0', fontSize: '0.875rem'
                                            }}>
                                                <FileText size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{upload.file.name}</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{upload.status}</span>
                                                    </div>

                                                    {/* Custom Progress Bar */}
                                                    <div style={{ height: '0.375rem', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%', backgroundColor: '#111827', width: `${upload.progress}%`,
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>

                                                    {upload.error && (
                                                        <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{upload.error}</p>
                                                    )}
                                                </div>
                                                {!isUploading && (
                                                    <button onClick={() => removeFile(index)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                {upload.status === 'completed' && <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
                                                {upload.status === 'error' && <AlertCircle size={16} style={{ color: '#ef4444' }} />}
                                                {(upload.status === 'uploading' || upload.status === 'processing') && <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    disabled={isUploading}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                                        padding: '0.5rem 1rem', backgroundColor: 'white', color: '#1f2937',
                                        border: '1px solid #e5e7eb', cursor: isUploading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={startUpload}
                                    disabled={uploads.length === 0 || isUploading}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                                        padding: '0.5rem 1rem', backgroundColor: '#111827', color: 'white',
                                        border: 'none', cursor: (uploads.length === 0 || isUploading) ? 'not-allowed' : 'pointer',
                                        opacity: (uploads.length === 0 || isUploading) ? 0.7 : 1
                                    }}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Iniciar Subida'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
