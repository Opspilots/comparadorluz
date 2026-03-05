import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffVersion } from '@/shared/types';
import { ElectricityTariffTable } from '../components/ElectricityTariffTable';
import { GasTariffTable } from '../components/GasTariffTable';
import { Loader2, ZapOff, Plus, Search, X, Zap, Flame, Calendar } from 'lucide-react';

const STYLES = {
    container: {
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
    },
    header: {
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    tabsContainer: {
        background: '#f1f5f9',
        padding: '0.3rem',
        borderRadius: '12px',
        display: 'flex',
        gap: '0.5rem'
    },
    tabButton: (isActive: boolean, activeColor: string) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
        background: isActive ? 'white' : 'transparent',
        color: isActive ? activeColor : '#64748b',
        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.2s ease'
    }),
    addButton: (type: 'electricity' | 'gas') => ({
        background: type === 'electricity' ? '#0f172a' : '#c2410c',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontWeight: 600,
        fontSize: '0.95rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.1s active'
    }),
    filtersBar: {
        background: 'white',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '1rem',
        alignItems: 'center'
    },
    searchWrapper: {
        position: 'relative' as const,
        flex: '1',
        minWidth: '250px'
    },
    searchIcon: {
        position: 'absolute' as const,
        left: '0.875rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8'
    },
    searchInput: {
        width: '100%',
        padding: '0.5rem 1rem 0.5rem 2.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    select: {
        padding: '0.5rem 2rem 0.5rem 0.75rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        color: '#1e293b',
        outline: 'none',
        background: 'white',
        cursor: 'pointer'
    },
    statusFilter: {
        borderLeft: '1px solid #e2e8f0',
        paddingLeft: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    statusButton: (isActive: boolean, status: string) => ({
        padding: '0.25rem 0.6rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: isActive ? (status === 'active' ? '#ecfdf5' : status === 'inactive' ? '#fef2f2' : '#f1f5f9') : 'transparent',
        color: isActive ? (status === 'active' ? '#059669' : status === 'inactive' ? '#dc2626' : '#475569') : '#94a3b8',
    }),
    clearButton: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: '#ef4444',
        fontWeight: 600,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
    },
    resultsArea: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '5rem'
    },
    emptyState: {
        textAlign: 'center' as const,
        padding: '5rem'
    },
    emptyIcon: (type: 'electricity' | 'gas') => ({
        width: '4rem',
        height: '4rem',
        borderRadius: '50%',
        background: type === 'electricity' ? '#fef9c3' : '#ffedd5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1rem'
    })
};

export default function TariffDashboard() {
    const [activeTab, setActiveTab] = useState<'electricity' | 'gas'>('electricity');
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
    const [supplierFilter, setSupplierFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [durationFilter, setDurationFilter] = useState<string>('all');
    const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [companyId, setCompanyId] = useState<string | null>(null);

    // Get current user's company
    useQuery({
        queryKey: ['current-user-company'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (userData?.company_id) {
                setCompanyId(userData.company_id);
            }
            return userData;
        }
    });

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    const { data: tariffs, isLoading } = useQuery({
        queryKey: ['tariff-versions', companyId, typeFilter, statusFilter, searchTerm, supplierFilter, startDate, endDate, activeTab],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('tariff_versions')
                .select('*, tariff_rates(*), tariff_components(*)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            // Status Filter
            if (statusFilter === 'active') {
                query = query.eq('is_active', true);
            } else if (statusFilter === 'inactive') {
                query = query.eq('is_active', false);
            }

            // Supply Type Filter (via Tab)
            if (activeTab === 'electricity') {
                query = query.in('tariff_type', ['2.0TD', '3.0TD', '6.0', '6.1TD', '6.2TD', '3.0A', '6.1A']);
            } else {
                query = query.in('tariff_type', ['RL.1', 'RL.2', 'RL.3', 'RL.4']);
            }

            // Type Filter
            if (typeFilter !== 'all') {
                query = query.eq('tariff_type', typeFilter);
            }

            // Supplier Filter
            if (supplierFilter !== 'all') {
                query = query.eq('supplier_id', supplierFilter);
            }

            // Search Filter
            if (searchTerm) {
                query = query.or(`tariff_name.ilike.%${searchTerm}%,tariff_code.ilike.%${searchTerm}%`);
            }

            // Date Filters
            if (startDate) {
                query = query.gte('valid_from', startDate);
            }
            if (endDate) {
                query = query.lte('valid_from', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as TariffVersion[];
        },
        enabled: !!companyId
    });

    // Automated Repair Logic: Backfill missing metadata in tariff_rates if mismatch found
    useEffect(() => {
        if (!tariffs || tariffs.length === 0) return;

        const repairData = async () => {
            let repairedAny = false;
            for (const t of tariffs) {
                const rates = t.tariff_rates || [];
                // If the version has duration/dates but rates don't, we repair
                const needsRepair = rates.length > 0 && rates.some(r =>
                    (r.contract_duration === null && t.contract_duration !== null) ||
                    (r.valid_from === null && t.valid_from !== null)
                );

                if (needsRepair && t.id) {
                    const { error } = await supabase
                        .from('tariff_rates')
                        .update({
                            contract_duration: t.contract_duration,
                            valid_from: t.valid_from,
                            valid_to: t.valid_to
                        })
                        .eq('tariff_version_id', t.id);

                    if (!error) repairedAny = true;
                }
            }
            if (repairedAny) {
                queryClient.invalidateQueries({ queryKey: ['tariff-versions'] });
            }
        };

        repairData();
    }, [tariffs, queryClient]);



    // Extract all unique validity months (valid_from) from all tariff rates to populate the selector
    const availableMonths = useMemo(() => {
        if (!tariffs) return [];
        const months = new Set<string>();
        tariffs.forEach(t => {
            (t.tariff_rates || []).forEach(r => {
                if (r.valid_from) {
                    const date = new Date(r.valid_from);
                    // Use the last day of the month to ensure mid-month rates are captured as active
                    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    months.add(monthKey);
                }
            });
            if (t.valid_from) {
                const date = new Date(t.valid_from);
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                months.add(monthKey);
            }
        });

        return Array.from(months).sort().reverse();
    }, [tariffs]);

    // Define available types based on active tab
    const electricityTypes = ['2.0TD', '3.0TD', '6.0', '6.1TD', '6.2TD'];
    const gasTypes = ['RL.1', 'RL.2', 'RL.3', 'RL.4'];
    const availableTariffTypes = activeTab === 'electricity' ? electricityTypes : gasTypes;

    // Collect unique contract durations from tariff_versions and their tariff_rates
    const availableDurations = useMemo(() => {
        if (!tariffs) return [];
        const durations = new Set<number | null>();
        tariffs.forEach(t => {
            durations.add(t.contract_duration ?? null);
            (t.tariff_rates || []).forEach((r: { contract_duration?: number | null }) => {
                durations.add(r.contract_duration ?? null);
            });
        });
        return Array.from(durations).sort((a, b) => {
            if (a === null) return -1;
            if (b === null) return 1;
            return a - b;
        });
    }, [tariffs]);

    // Client-side duration filter
    const filteredTariffs = useMemo(() => {
        if (!tariffs || durationFilter === 'all') return tariffs;
        const targetDuration = durationFilter === 'sin_compromiso' ? null : parseInt(durationFilter);
        return tariffs.filter(t => {
            if (t.contract_duration === targetDuration) return true;
            return (t.tariff_rates || []).some((r: { contract_duration?: number | null }) =>
                (r.contract_duration ?? null) === targetDuration
            );
        });
    }, [tariffs, durationFilter]);

    const resetFilters = () => {
        setSearchTerm('');
        setTypeFilter('all');
        setStatusFilter('all');
        setSupplierFilter('all');
        setDurationFilter('all');
        setStartDate('');
        setEndDate('');
        setSelectedIds([]);
    };

    if (!companyId) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '24rem' }}>
                <Loader2 className="animate-spin" style={{ color: '#0ea5e9', width: '2.5rem', height: '2.5rem' }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={STYLES.container}>

            {/* Header / Tabs / Action Area */}
            <div style={STYLES.header}>

                {/* Tabs */}
                <div style={STYLES.tabsContainer}>
                    <button
                        onClick={() => { setActiveTab('electricity'); resetFilters(); }}
                        style={STYLES.tabButton(activeTab === 'electricity', '#eab308')}
                    >
                        <Zap size={18} fill={activeTab === 'electricity' ? 'currentColor' : 'none'} />
                        Electricidad
                    </button>
                    <button
                        onClick={() => { setActiveTab('gas'); resetFilters(); }}
                        style={STYLES.tabButton(activeTab === 'gas', '#f97316')}
                    >
                        <Flame size={18} fill={activeTab === 'gas' ? 'currentColor' : 'none'} />
                        Gas
                    </button>
                    {selectedIds.length > 0 && (
                        <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', borderLeft: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{selectedIds.length} seleccionadas</span>
                            <button
                                onClick={async () => {
                                    if (confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} tarifas?`)) {
                                        const { error } = await supabase.from('tariff_versions').delete().in('id', selectedIds);
                                        if (error) alert('Error al eliminar: ' + error.message);
                                        else {
                                            setSelectedIds([]);
                                            window.location.reload(); // Simple reload for now
                                        }
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Eliminar
                            </button>
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.from('tariff_versions').update({ is_active: true }).in('id', selectedIds);
                                    if (error) alert('Error: ' + error.message);
                                    else {
                                        setSelectedIds([]);
                                        window.location.reload();
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Activar
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Button - Distinct Style */}
                <button
                    onClick={() => navigate('/admin/tariffs/new', { state: { supplyType: activeTab } })}
                    className="btn"
                    style={STYLES.addButton(activeTab)}
                >
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Nueva Tarifa de {activeTab === 'electricity' ? 'Luz' : 'Gas'}</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="tour-tariffs-filters" style={STYLES.filtersBar}>
                <div style={STYLES.searchWrapper}>
                    <Search size={18} style={STYLES.searchIcon} />
                    <input
                        type="text"
                        placeholder={`Buscar tarifas de ${activeTab === 'electricity' ? 'luz' : 'gas'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={STYLES.searchInput}
                    />
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Calendar size={14} style={{ color: '#64748b' }} />
                        <select
                            value={viewDate.substring(0, 7) + "-01"}
                            onChange={(e) => setViewDate(e.target.value)}
                            style={{ ...STYLES.select, border: 'none', background: 'transparent', padding: '0.25rem 1.5rem 0.25rem 0.25rem', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                            <option value={new Date().toISOString().split('T')[0].substring(0, 7) + "-01"}>Mes Actual</option>
                            {availableMonths.map(m => {
                                const date = new Date(m);
                                const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                                return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                            })}
                        </select>
                    </div>

                    <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        style={STYLES.select}
                    >
                        <option value="all">Todas las comercializadoras</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={STYLES.select}
                    >
                        <option value="all">Todos los peajes</option>
                        {availableTariffTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {availableDurations.length > 1 && (
                        <select
                            value={durationFilter}
                            onChange={(e) => setDurationFilter(e.target.value)}
                            style={STYLES.select}
                        >
                            <option value="all">Todas las duraciones</option>
                            {availableDurations.map(d => (
                                <option key={d ?? 'null'} value={d === null ? 'sin_compromiso' : String(d)}>
                                    {d === null ? 'Sin compromiso' : `${d} meses`}
                                </option>
                            ))}
                        </select>
                    )}

                    <div style={STYLES.statusFilter}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Estado:</span>
                        {(['all', 'active', 'inactive'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                style={STYLES.statusButton(statusFilter === s, s)}
                            >
                                {s === 'all' ? 'Todas' : s === 'active' ? 'Activas' : 'Inactivas'}
                            </button>
                        ))}
                    </div>
                </div>

                {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || supplierFilter !== 'all' || durationFilter !== 'all' || startDate || endDate) && (
                    <button
                        onClick={resetFilters}
                        style={STYLES.clearButton}
                    >
                        <X size={14} /> Limpiar
                    </button>
                )}
            </div>

            {/* Results Area */}
            <div style={STYLES.resultsArea}>
                {isLoading ? (
                    <div style={STYLES.loadingContainer}>
                        <Loader2 className="animate-spin" style={{ color: activeTab === 'electricity' ? '#ca8a04' : '#ea580c', width: '2rem', height: '2rem' }} />
                    </div>
                ) : filteredTariffs && filteredTariffs.length > 0 ? (
                    activeTab === 'electricity'
                        ? <ElectricityTariffTable
                            tariffs={filteredTariffs}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            viewDate={viewDate}
                        />
                        : <GasTariffTable
                            tariffs={filteredTariffs}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            viewDate={viewDate}
                        />
                ) : (
                    <div style={STYLES.emptyState}>
                        <div style={STYLES.emptyIcon(activeTab)}>
                            {activeTab === 'electricity'
                                ? <ZapOff style={{ width: '2rem', height: '2rem', color: '#ca8a04' }} />
                                : <Flame style={{ width: '2rem', height: '2rem', color: '#ea580c' }} />
                            }
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 500, color: '#0f172a' }}>No hay tarifas de {activeTab === 'electricity' ? 'luz' : 'gas'}</div>
                        <p style={{ color: '#64748b', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                            Prueba a cambiar los filtros o añade una nueva tarifa.
                        </p>
                        <button className="btn btn-secondary" onClick={resetFilters}>
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
