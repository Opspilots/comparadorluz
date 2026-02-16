import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffVersion } from '@/shared/types';
import { ElectricityTariffTable } from '../components/ElectricityTariffTable';
import { GasTariffTable } from '../components/GasTariffTable';
import { Loader2, ZapOff, Plus, Search, Filter, X, Zap, Flame } from 'lucide-react';

export default function TariffDashboard() {
    const [activeTab, setActiveTab] = useState<'electricity' | 'gas'>('electricity');
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
    const [supplierFilter, setSupplierFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const navigate = useNavigate();
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
                query = query.in('tariff_type', ['2.0TD', '3.0TD', '6.0', '6.1TD', '3.0A', '6.1A']);
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

    // Define available types based on active tab
    const electricityTypes = ['2.0TD', '3.0TD', '6.0', '6.1TD'];
    const gasTypes = ['RL.1', 'RL.2', 'RL.3', 'RL.4'];
    const availableTariffTypes = activeTab === 'electricity' ? electricityTypes : gasTypes;

    const resetFilters = () => {
        setSearchTerm('');
        setTypeFilter('all');
        setStatusFilter('all');
        setSupplierFilter('all');
        setStartDate('');
        setEndDate('');
    };

    if (!companyId) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '24rem' }}>
                <Loader2 className="animate-spin" style={{ color: '#0ea5e9', width: '2.5rem', height: '2.5rem' }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Header / Tabs / Action Area */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                {/* Tabs */}
                <div style={{ background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px', display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => { setActiveTab('electricity'); resetFilters(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            background: activeTab === 'electricity' ? 'white' : 'transparent',
                            color: activeTab === 'electricity' ? '#eab308' : '#64748b',
                            boxShadow: activeTab === 'electricity' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Zap size={18} fill={activeTab === 'electricity' ? 'currentColor' : 'none'} />
                        Electricidad
                    </button>
                    <button
                        onClick={() => { setActiveTab('gas'); resetFilters(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            fontSize: '0.9rem', fontWeight: 600,
                            background: activeTab === 'gas' ? 'white' : 'transparent',
                            color: activeTab === 'gas' ? '#f97316' : '#64748b',
                            boxShadow: activeTab === 'gas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Flame size={18} fill={activeTab === 'gas' ? 'currentColor' : 'none'} />
                        Gas
                    </button>
                </div>

                {/* Add Button - Distinct Style */}
                <button
                    onClick={() => navigate('/admin/tariffs/new', { state: { supplyType: activeTab } })}
                    className="btn"
                    style={{
                        background: activeTab === 'electricity' ? '#0f172a' : '#c2410c', // Dark for Elec, Burnt Orange for Gas
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        fontWeight: 600, fontSize: '0.95rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: 'none', cursor: 'pointer',
                        transition: 'transform 0.1s active'
                    }}
                >
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Nueva Tarifa de {activeTab === 'electricity' ? 'Luz' : 'Gas'}</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="tour-tariffs-filters" style={{
                background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0',
                marginBottom: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder={`Buscar tarifas de ${activeTab === 'electricity' ? 'luz' : 'gas'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '8px',
                            border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>

                    <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        style={{
                            padding: '0.5rem 2rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                            fontSize: '0.85rem', color: '#1e293b', outline: 'none', background: 'white', cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todas las comercializadoras</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: '0.5rem 2rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                            fontSize: '0.85rem', color: '#1e293b', outline: 'none', background: 'white', cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todos los peajes</option>
                        {availableTariffTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Estado:</span>
                        {(['all', 'active', 'inactive'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                style={{
                                    padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: statusFilter === s ? (s === 'active' ? '#ecfdf5' : s === 'inactive' ? '#fef2f2' : '#f1f5f9') : 'transparent',
                                    color: statusFilter === s ? (s === 'active' ? '#059669' : s === 'inactive' ? '#dc2626' : '#475569') : '#94a3b8',
                                }}
                            >
                                {s === 'all' ? 'Todas' : s === 'active' ? 'Activas' : 'Inactivas'}
                            </button>
                        ))}
                    </div>
                </div>

                {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate) && (
                    <button
                        onClick={resetFilters}
                        style={{
                            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem',
                            color: '#ef4444', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer'
                        }}
                    >
                        <X size={14} /> Limpiar
                    </button>
                )}
            </div>

            {/* Results Area */}
            <div style={{
                background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}>
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                        <Loader2 className="animate-spin" style={{ color: activeTab === 'electricity' ? '#ca8a04' : '#ea580c', width: '2rem', height: '2rem' }} />
                    </div>
                ) : tariffs && tariffs.length > 0 ? (
                    activeTab === 'electricity'
                        ? <ElectricityTariffTable tariffs={tariffs} />
                        : <GasTariffTable tariffs={tariffs} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '5rem' }}>
                        <div style={{
                            width: '4rem', height: '4rem', borderRadius: '50%',
                            background: activeTab === 'electricity' ? '#fef9c3' : '#ffedd5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
                        }}>
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
