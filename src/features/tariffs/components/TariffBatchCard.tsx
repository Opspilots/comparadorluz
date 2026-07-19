
import { format } from 'date-fns';
import { FileText, Calendar, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';

import { TariffBatch } from '@/shared/types';
import { useNavigate } from 'react-router-dom';

interface TariffBatchCardProps {
    batch: TariffBatch;
}

export function TariffBatchCard({ batch }: TariffBatchCardProps) {
    const navigate = useNavigate();



    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'published': return <CheckCircle className="w-3 h-3 mr-1" />;
            case 'pending_review': return <AlertCircle className="w-3 h-3 mr-1" />;
            case 'processing': return <Clock className="w-3 h-3 mr-1" />;
            case 'validation_failed': return <AlertCircle className="w-3 h-3 mr-1" />;
            default: return null;
        }
    };

    return (
        <div
            className="card-hover-shadow"
            style={{
                backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column'
            }}
        >
            <div style={{ padding: '1.5rem', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0, lineHeight: 1 }}>
                    Lote #{batch.id.slice(0, 8)}
                </h3>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '0.125rem 0.625rem',
                    borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                    backgroundColor: '#f3f4f6', color: '#1f2937'
                }}>
                    {getStatusIcon(batch.status)}
                    {batch.status.replace('_', ' ')}
                </span>
            </div>
            <div style={{ padding: '1.5rem', paddingTop: '1rem', flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} style={{ color: '#9ca3af' }} />
                    {batch.file_count} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>archivos</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <Calendar size={12} style={{ marginRight: '0.25rem' }} />
                    {format(new Date(batch.created_at), 'dd/MM/yyyy HH:mm')}
                </div>
            </div>
            <div style={{ padding: '1.5rem', paddingTop: 0 }}>
                <button
                    className="btn-hover-gray-bg"
                    onClick={() => navigate(`/admin/tariffs/${batch.id}`)}
                    style={{
                        width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb', color: '#1f2937',
                        cursor: 'pointer',
                    }}
                >
                    Ver Detalles
                    <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                </button>
            </div>
        </div>
    );
}
