import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, ArrowLeft, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';


interface TariffFile {
    id: string;
    filename: string;
    status: string; // 'pending' | 'processing' | 'completed' | 'failed'
    file_size_bytes: number;
    created_at: string;
}

interface TariffBatch {
    id: string;
    status: string;
    file_count: number;
    created_at: string;
    files: TariffFile[];
}

export default function BatchDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: batch, isLoading, error } = useQuery({
        queryKey: ['tariff-batch', id],
        queryFn: async () => {
            if (!id) throw new Error('No batch ID');

            // Fetch batch details
            const { data: batchData, error: batchError } = await supabase
                .from('tariff_batches')
                .select('*')
                .eq('id', id)
                .single();

            if (batchError) throw batchError;

            // Fetch files in batch
            const { data: filesData, error: filesError } = await supabase
                .from('tariff_files')
                .select('*')
                .eq('batch_id', id);

            if (filesError) throw filesError;

            return {
                ...batchData,
                files: filesData || []
            } as TariffBatch;
        },
        enabled: !!id,
        refetchInterval: (query) => {
            const data = query.state.data;
            // Poll if status is processing or uploaded
            if (data?.status === 'processing' || data?.status === 'uploaded') {
                return 2000;
            }
            return false;
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="container mx-auto py-8 text-center text-red-500">
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Error cargando el lote</div>
                <p style={{ marginBottom: '1rem' }}>{error instanceof Error ? error.message : String(error) || 'Lote no encontrado'}</p>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#4b5563', fontSize: '0.875rem', textDecoration: 'underline'
                    }}
                >
                    Volver
                </button>
            </div>
        );
    }



    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'failed': return <AlertCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        marginBottom: '1rem', paddingLeft: 0, background: 'transparent',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: '#4b5563', fontSize: '0.875rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.paddingLeft = '0.5rem'}
                    onMouseLeave={(e) => e.currentTarget.style.paddingLeft = '0'}
                >
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                    Volver al Dashboard
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            Lote de Tarifas
                            <span style={{
                                padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                                border: '1px solid transparent', textTransform: 'uppercase',
                                backgroundColor: batch.status === 'completed' ? '#dcfce7' : batch.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                                color: batch.status === 'completed' ? '#166534' : batch.status === 'failed' ? '#991b1b' : '#1f2937',
                                borderColor: batch.status === 'completed' ? '#bbf7d0' : batch.status === 'failed' ? '#fecaca' : '#e5e7eb'
                            }}>
                                {batch.status.toUpperCase()}
                            </span>
                        </div>
                        <p style={{ color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>ID: {batch.id}</p>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Fecha: {new Date(batch.created_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                </div>

                <div>
                    {batch.files.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                            No hay archivos en este lote.
                        </div>
                    ) : (
                        batch.files.map((file, idx) => (
                            <div
                                key={file.id}
                                style={{
                                    padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    backgroundColor: 'white',
                                    borderBottom: idx < batch.files.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.25rem', color: '#3b82f6' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>{file.filename}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{(file.file_size_bytes / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                                        backgroundColor: file.status === 'completed' ? '#dcfce7' : file.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                                        color: file.status === 'completed' ? '#166534' : file.status === 'failed' ? '#991b1b' : '#1f2937',
                                    }}>
                                        {getStatusIcon(file.status || 'pending')}
                                        <span style={{ textTransform: 'capitalize' }}>{file.status || 'pending'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
