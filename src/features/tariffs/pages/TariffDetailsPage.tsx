import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { removeEmojis } from '@/shared/lib/utils';
import { Loader2, ArrowLeft, Edit, Trash2, Zap, FileText, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';

import { TariffRate, TariffVersion, Supplier, TariffStructure, TariffSchedule } from '@/types/tariff';
import { findActiveRate, hasRateHistory, toPowerMonthly } from '../lib/tariffUtils';

interface JoinedTariff extends TariffVersion {
    tariff_rates: TariffRate[];
    tariff_schedules: TariffSchedule[];
    tariff_structures: TariffStructure;
    suppliers: Supplier;
}

// Helper to group rates by duration and then by validity
const groupRatesByDurationAndValidity = (rates: TariffRate[]) => {
    // Map<DurationKey, Map<ValidityKey, TariffRate[]>>
    const groups = new Map<string, Map<string, TariffRate[]>>();

    rates.forEach(r => {
        const dKey = r.contract_duration ? r.contract_duration.toString() : "any";
        const vKey = `${r.valid_from || 'none'}_${r.valid_to || 'none'}`;

        if (!groups.has(dKey)) groups.set(dKey, new Map());
        if (!groups.get(dKey)!.has(vKey)) groups.get(dKey)!.set(vKey, []);

        groups.get(dKey)!.get(vKey)!.push(r);
    });

    const sortedDurations = new Map([...groups.entries()].sort((a, b) => {
        if (a[0] === 'any') return -1;
        if (b[0] === 'any') return 1;
        return parseInt(a[0]) - parseInt(b[0]);
    }));

    sortedDurations.forEach((validityMap, dKey) => {
        const sortedMap = new Map([...validityMap.entries()].sort((a, b) => {
            const aFrom = a[1][0]?.valid_from || '';
            const bFrom = b[1][0]?.valid_from || '';
            if (aFrom > bFrom) return -1;
            if (aFrom < bFrom) return 1;
            return 0;
        }));
        sortedDurations.set(dKey, sortedMap);
    });

    return sortedDurations;
};

export default function TariffDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tariff, setTariff] = useState<JoinedTariff | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchTariff = async () => {
            try {
                // 1. Fetch the primary version
                const { data: primary, error: pError } = await supabase
                    .from('tariff_versions')
                    .select('*, tariff_rates(*), tariff_schedules(*), tariff_structures(*), suppliers(*)')
                    .eq('id', id)
                    .single();

                if (pError) throw pError;

                // 2. Fetch all other versions that share the same identity (Name + Supplier + Structure)
                // This ensures we see the full history in the selector
                const { data: others, error: oError } = await supabase
                    .from('tariff_versions')
                    .select('*, tariff_rates(*), tariff_schedules(*)')
                    .eq('tariff_name', primary.tariff_name)
                    .eq('supplier_id', primary.supplier_id)
                    .eq('tariff_structure_id', primary.tariff_structure_id)
                    .neq('id', id);

                if (oError) {
                    console.error("Error fetching other versions:", oError);
                    setTariff(primary); // Fallback to just the current version
                } else {
                    // Combine rates from all versions for grouping
                    const allRates = [
                        ...(primary.tariff_rates || []),
                        ...((others || []).flatMap(v => v.tariff_rates || []))
                    ];
                    setTariff({
                        ...primary,
                        tariff_rates: allRates
                    });
                }
            } catch (error) {
                console.error("Error loading tariff:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la tarifa.' });
            } finally {
                setLoading(false);
            }
        };
        fetchTariff();
    }, [id, toast]);

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

    const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const groupedRates = useMemo<Map<string, Map<string, TariffRate[]>>>(() => {
        if (!tariff?.tariff_rates) return new Map<string, Map<string, TariffRate[]>>();
        return groupRatesByDurationAndValidity(tariff.tariff_rates);
    }, [tariff]);

    const activeVKey = useMemo(() => {
        if (groupedRates.size === 0) return null;
        const allKeys = new Set<string>();
        groupedRates.forEach(vMap => vMap.forEach((_, vKey) => allKeys.add(vKey)));

        if (!selectedMonthYear) return null;

        const [yearStr, monthStr] = selectedMonthYear.split('-');
        if (!yearStr || !monthStr) return null;

        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        let bestMatch: string | null = null;
        for (const vk of Array.from(allKeys)) {
            const [vf, vt] = vk.split('_');
            const vfDate = vf === 'none' ? '0000-00-00' : vf;
            const vtDate = vt === 'none' ? '9999-99-99' : vt;

            // Overlap condition
            if (vfDate <= endOfMonth && vtDate >= startOfMonth) {
                if (!bestMatch) {
                    bestMatch = vk;
                } else {
                    const bestVfDate = bestMatch.split('_')[0] === 'none' ? '0000-00-00' : bestMatch.split('_')[0];
                    if (vfDate > bestVfDate) {
                        bestMatch = vk;
                    }
                }
            }
        }
        return bestMatch;
    }, [groupedRates, selectedMonthYear]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;
    if (!tariff) return <div>Tarifa no encontrada</div>;

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

    const durationKeys = Array.from(groupedRates.keys());

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
                            {removeEmojis(tariff.name)}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
                {/* Main Info */}
                <div className="card" style={{ gridColumn: 'span 8', padding: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Precios y Duraciones</h3>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                        {durationKeys.length === 0 ? (
                            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No hay precios definidos.</p>
                        ) : (
                            <Tabs defaultValue={durationKeys[0]}>
                                <TabsList className="mb-6">
                                    {durationKeys.map(key => (
                                        <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                                            {key === 'any' ? (
                                                <>Estándar (Base)</>
                                            ) : (
                                                <><Clock size={14} /> {key} Meses</>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {durationKeys.map(dKey => {
                                    const validityMap = groupedRates.get(dKey) || new Map();
                                    const rates = activeVKey ? (validityMap.get(activeVKey) || []) : [];

                                    if (!activeVKey || rates.length === 0) {
                                        return (
                                            <TabsContent key={dKey} value={dKey}>
                                                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                                                    <p style={{ color: '#64748b', fontWeight: 500 }}>No hay precios disponibles para la fecha seleccionada.</p>
                                                </div>
                                            </TabsContent>
                                        );
                                    }

                                    return (
                                        <TabsContent key={dKey} value={dKey} className="space-y-6">

                                            {/* Energy Section */}
                                            {(() => {
                                                const energyRates = rates.filter((r: TariffRate) => r.item_type === 'energy');
                                                return (
                                                    <div>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Energía</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                                            {(() => {
                                                                const energyRates = rates.filter((r: TariffRate) => r.item_type === 'energy');
                                                                const pKeys = Array.from(new Set(energyRates.map((r: TariffRate) => r.period).filter(Boolean))) as string[];

                                                                // Fallback for gas/single period
                                                                if (pKeys.length === 0 && energyRates.length > 0) {
                                                                    const targetDate = activeVKey.split('_')[0] === 'none' ? undefined : activeVKey.split('_')[0];
                                                                    const active = findActiveRate(rates as any, 'energy', undefined, targetDate, dKey === 'any' ? null : parseInt(dKey));
                                                                    if (!active) return null;
                                                                    return (
                                                                        <div key="energy-active" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Energía</div>
                                                                                {hasRateHistory(tariff.tariff_rates || [], 'energy', undefined, dKey === 'any' ? null : parseInt(dKey)) && <Clock size={12} style={{ color: '#6366f1' }} />}
                                                                            </div>
                                                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{active.price?.toFixed(6)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{active.unit}</span></div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return pKeys.map(p => {
                                                                    const targetDate = activeVKey.split('_')[0] === 'none' ? undefined : activeVKey.split('_')[0];
                                                                    const active = findActiveRate(rates as any, 'energy', p, targetDate, dKey === 'any' ? null : parseInt(dKey));
                                                                    if (!active) return null;
                                                                    return (
                                                                        <div key={p} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{p}</div>
                                                                                {hasRateHistory(tariff.tariff_rates || [], 'energy', p, dKey === 'any' ? null : parseInt(dKey)) && <Clock size={12} style={{ color: '#6366f1' }} />}
                                                                            </div>
                                                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{active.price?.toFixed(6)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{active.unit}</span></div>
                                                                            {active.price_formula && <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#e2e8f0', padding: '0.125rem 0.25rem', marginTop: '0.25rem', borderRadius: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={active.price_formula}>{active.price_formula}</div>}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                            {energyRates.length === 0 && <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>Sin precios de energía</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Power Section */}
                                            {(() => {
                                                const powerRates = rates.filter((r: TariffRate) => r.item_type === 'power');
                                                return (
                                                    <div>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Potencia</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                                            {(() => {
                                                                const powerRates = rates.filter((r: TariffRate) => r.item_type === 'power');
                                                                const pKeys = Array.from(new Set(powerRates.map((r: TariffRate) => r.period).filter(Boolean))) as string[];
                                                                return pKeys.map(p => {
                                                                    const targetDate = activeVKey.split('_')[0] === 'none' ? undefined : activeVKey.split('_')[0];
                                                                    const active = findActiveRate(rates as any, 'power', p, targetDate, dKey === 'any' ? null : parseInt(dKey)) ||
                                                                        findActiveRate(rates as any, 'power', 'P1', targetDate, dKey === 'any' ? null : parseInt(dKey));
                                                                    if (!active) return null;
                                                                    return (
                                                                        <div key={p} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{p}</div>
                                                                                {hasRateHistory(tariff.tariff_rates || [], 'power', p, dKey === 'any' ? null : parseInt(dKey)) && <Clock size={12} style={{ color: '#6366f1' }} />}
                                                                            </div>
                                                                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{active.price != null ? toPowerMonthly(active.price, active.unit).toFixed(6) : '-'} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>€/kW/mes</span></div>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                            {powerRates.length === 0 && <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>Sin precios de potencia</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Fixed Fee Section */}
                                            {(() => {
                                                const targetDate = activeVKey.split('_')[0] === 'none' ? undefined : activeVKey.split('_')[0];
                                                const active = findActiveRate(rates as any, 'fixed_fee', undefined, targetDate, dKey === 'any' ? null : parseInt(dKey)) ||
                                                    findActiveRate(rates as any, 'fixed_fee', 'P1', targetDate, dKey === 'any' ? null : parseInt(dKey));
                                                if (!active) return null;
                                                return (
                                                    <div>
                                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Término Fijo</h4>
                                                        <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', display: 'grid', gap: '1rem' }}>
                                                            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Fijo</div>
                                                                    {hasRateHistory(tariff.tariff_rates || [], 'fixed_fee', undefined, dKey === 'any' ? null : parseInt(dKey)) && <Clock size={12} style={{ color: '#6366f1' }} />}
                                                                </div>
                                                                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{active.price?.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280' }}>{active.unit}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}

                                        </TabsContent>
                                    );
                                })}
                            </Tabs>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                            <div>
                                <span style={{ display: 'block', color: '#6b7280', marginBottom: '0.25rem' }}>Tipo de Precio</span>
                                <span style={{ fontWeight: 500 }}>{tariff.is_indexed ? 'Indexado' : 'Fijo'}</span>
                            </div>
                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Versión seleccionada</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={18} style={{ color: '#6366f1' }} />
                                    <input
                                        type="month"
                                        value={selectedMonthYear}
                                        onChange={(e) => setSelectedMonthYear(e.target.value)}
                                        style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '1rem', fontWeight: 700, color: '#111827', outline: 'none', cursor: 'pointer', width: '100%' }}
                                    />
                                </div>
                                {!activeVKey && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500, padding: '0.5rem', background: '#fee2e2', borderRadius: '0.25rem' }}>
                                        No hay versión para esta fecha.
                                    </div>
                                )}
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
