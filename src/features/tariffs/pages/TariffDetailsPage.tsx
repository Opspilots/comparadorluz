import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { removeEmojis } from '@/shared/lib/utils';
import { Loader2, ArrowLeft, Edit, Trash2, Zap, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

export default function TariffDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tariff, setTariff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('energy');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchTariff = async () => {
            try {
                const { data, error } = await supabase
                    .from('tariff_versions')
                    .select('*, tariff_rates(*), tariff_schedules(*), tariff_structures(*), suppliers(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setTariff(data);
            } catch (error) {
                console.error("Error loading tariff:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la tarifa.' });
            } finally {
                setLoading(false);
            }
        };
        fetchTariff();
    }, [id]);

    const handleDelete = async () => {
        try {
            const { error } = await supabase.from('tariff_versions').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Tarifa eliminada' });
            navigate('/admin/tariffs');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
        }
        setShowDeleteDialog(false);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;
    if (!tariff) return <div>Tarifa no encontrada</div>;

    const energyRates = tariff.tariff_rates?.filter((r: any) => r.item_type === 'energy') || [];
    const powerRates = tariff.tariff_rates?.filter((r: any) => r.item_type === 'power') || [];

    const badgeStyle = (isActive: boolean) => ({
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        border: '1px solid transparent',
        background: isActive ? '#dcfce7' : '#f3f4f6',
        color: isActive ? '#15803d' : '#4b5563',
        borderColor: isActive ? '#bbf7d0' : '#e5e7eb'
    });

    const tabButtonStyle = (isActive: boolean) => ({
        padding: '0.5rem 1rem',
        borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
        color: isActive ? '#2563eb' : '#6b7280',
        fontWeight: isActive ? 600 : 500,
        background: 'transparent',
        border: 'none',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid' as const,
        borderBottomColor: isActive ? '#2563eb' : 'transparent',
        cursor: 'pointer',
        fontSize: '0.875rem'
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/admin/tariffs')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: '#111827' }}>
                            {removeEmojis(tariff.tariff_name)}
                            <span style={badgeStyle(tariff.is_active)}>
                                {tariff.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            <Zap size={16} /> {removeEmojis(tariff.suppliers?.name)}
                            <span style={{ margin: '0 0.25rem' }}>•</span>
                            <FileText size={16} /> {tariff.tariff_structures?.name} ({tariff.tariff_structures?.code})
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="btn btn-secondary"
                        style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Trash2 size={16} /> Eliminar
                    </button>
                    <button
                        onClick={() => navigate(`/admin/tariffs/edit/${tariff.id}`)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Edit size={16} /> Editar
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Main Info */}
                <div className="card" style={{ gridColumn: 'span 2', padding: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>

                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                            <button
                                style={tabButtonStyle(activeTab === 'energy')}
                                onClick={() => setActiveTab('energy')}
                            >
                                Energía
                            </button>
                            <button
                                style={tabButtonStyle(activeTab === 'power')}
                                onClick={() => setActiveTab('power')}
                            >
                                Potencia
                            </button>
                        </div>

                        {activeTab === 'energy' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {energyRates.map((rate: any) => (
                                    <div key={rate.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{rate.period}</div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{rate.price?.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{rate.unit}</span></div>
                                        {rate.price_formula && <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#e2e8f0', padding: '0.125rem 0.25rem', marginTop: '0.25rem', borderRadius: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rate.price_formula}>{rate.price_formula}</div>}
                                    </div>
                                ))}
                                {energyRates.length === 0 && <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin precios de energía definidos.</p>}
                            </div>
                        )}

                        {activeTab === 'power' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {powerRates.map((rate: any) => (
                                    <div key={rate.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{rate.period}</div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{rate.price?.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{rate.unit}</span></div>
                                    </div>
                                ))}
                                {powerRates.length === 0 && <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin precios de potencia definidos.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                            <div>
                                <span style={{ display: 'block', color: '#6b7280', marginBottom: '0.25rem' }}>Tipo de Precio</span>
                                <span style={{ fontWeight: 500 }}>{tariff.is_indexed ? 'Indexado' : 'Fijo'}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#6b7280', marginBottom: '0.25rem' }}>Válida Desde</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} style={{ color: '#9ca3af' }} />
                                    <span style={{ fontWeight: 500 }}>{format(new Date(tariff.valid_from), 'dd/MM/yyyy')}</span>
                                </div>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#6b7280', marginBottom: '0.25rem' }}>Código Interno</span>
                                <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{tariff.code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>

                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                            {tariff.tariff_schedules?.length > 0
                                ? `${tariff.tariff_schedules.length} reglas de horario definidas.`
                                : 'Sin horarios personalizados (Usa defecto BOE).'}
                        </p>
                        <button
                            onClick={() => navigate(`/admin/tariffs/edit/${tariff.id}`)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                padding: 0,
                                marginTop: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            Ver Horarios Completos &rarr;
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Eliminar tarifa"
                message="¿Estás seguro de eliminar esta tarifa? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </div>
    );
}
