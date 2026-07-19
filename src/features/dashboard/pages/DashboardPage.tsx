import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { MetricCard } from '../components/MetricCard'
import { DashboardChart } from '../components/DashboardChart'
import { RecentActivity } from '../components/RecentActivity'

import { Users, FileText, CheckCircle, Plus, Search, FileSignature, ArrowRight, Clock, TrendingUp, Euro } from 'lucide-react'

interface PipelineContract {
    id: string
    contract_number: string | null
    status: string
    annual_value_eur: number
    created_at: string
    customers?: { name: string }[] | null
    tariff_versions?: { tariff_name: string; suppliers?: { name: string }[] | null }[] | null
}

const contractStatusLabel: Record<string, string> = {
    pending: 'Pendiente',
    signed: 'Firmado',
    active: 'Activo',
    cancelled: 'Cancelado',
    completed: 'Completado',
}

const contractStatusStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid transparent' }
    switch (status) {
        case 'active': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
        case 'signed': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
        case 'pending': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
        case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
        case 'completed': return { ...base, background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }
        default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
    }
}

export function DashboardPage() {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalContracts: 0,
        activeContracts: 0,
        pendingContracts: 0,
        monthlyComparisons: 0,
        pendingCommissions: 0,
    })
    const [recentContracts, setRecentContracts] = useState<PipelineContract[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboardStats = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) throw new Error('No company')
            const cid = profile.company_id

            const monthStart = new Date()
            monthStart.setDate(1)
            monthStart.setHours(0, 0, 0, 0)

            const [customersRes, contractsRes, activeContractsRes, pendingContractsRes, monthCompsRes, pendingContractDataRes, recentContractsRes] = await Promise.all([
                supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', cid),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'active'),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'pending'),
                supabase.from('comparisons').select('id', { count: 'exact', head: true }).eq('company_id', cid).gte('created_at', monthStart.toISOString()),
                supabase.from('contracts').select('commission_eur').eq('company_id', cid).eq('status', 'pending'),
                supabase.from('contracts').select('id, contract_number, status, annual_value_eur, created_at, customers(name), tariff_versions(tariff_name, suppliers(name))').eq('company_id', cid).order('created_at', { ascending: false }).limit(5),
            ])

            if (customersRes.error) throw customersRes.error
            if (contractsRes.error) throw contractsRes.error
            if (activeContractsRes.error) throw activeContractsRes.error

            const pendingCommissions = (pendingContractDataRes.data || []).reduce((sum, c) => sum + (c.commission_eur || 0), 0)

            setStats({
                totalCustomers: customersRes.count || 0,
                totalContracts: contractsRes.count || 0,
                activeContracts: activeContractsRes.count || 0,
                pendingContracts: pendingContractsRes.count || 0,
                monthlyComparisons: monthCompsRes.count || 0,
                pendingCommissions,
            })

            setRecentContracts((recentContractsRes.data || []) as unknown as PipelineContract[])
        } catch (err) {
            console.error('Error fetching dashboard stats:', err)
            setError('No se pudieron cargar las estadísticas. Comprueba tu conexión.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardStats()
    }, [fetchDashboardStats])

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                Cargando panel...
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {error && (
                <div style={{
                    padding: '1rem', background: '#fef2f2', color: '#991b1b',
                    borderRadius: '10px', border: '1px solid #fee2e2',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{error}</span>
                    <button
                        onClick={() => { setError(null); setLoading(true); fetchDashboardStats() }}
                        style={{
                            marginLeft: 'auto', padding: '0.375rem 0.75rem', borderRadius: 6,
                            border: '1px solid #fecaca', background: '#fff', color: '#dc2626',
                            fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Panel de Control</h1>
                    <p className="page-subtitle">Resumen general de tu actividad</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                <MetricCard
                    title="Total Clientes"
                    value={stats.totalCustomers}
                    icon={<Users size={20} />}
                    trend="up"
                    subtitle="Cartera actual"
                />
                <MetricCard
                    title="Total Contratos"
                    value={stats.totalContracts}
                    icon={<FileText size={20} />}
                    trend="up"
                    subtitle="Histórico completo"
                />
                <MetricCard
                    title="Contratos Activos"
                    value={stats.activeContracts}
                    icon={<CheckCircle size={20} />}
                    trend="neutral"
                    subtitle="En vigor"
                />
                <MetricCard
                    title="Contratos Pendientes"
                    value={stats.pendingContracts}
                    icon={<Clock size={20} />}
                    trend="neutral"
                    subtitle="Requieren atención"
                />
                <MetricCard
                    title="Comparativas (mes)"
                    value={stats.monthlyComparisons}
                    icon={<TrendingUp size={20} />}
                    trend="up"
                    subtitle="Este mes"
                />
                <MetricCard
                    title="Comisiones Pendientes"
                    value={stats.pendingCommissions}
                    format="currency"
                    icon={<Euro size={20} />}
                    trend="neutral"
                    subtitle="Por cobrar"
                />
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                <div className="grid gap-5 dashboard-grid-2col" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', display: 'grid' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Chart */}
                        <div className="dashboard-chart" style={{ height: '400px' }}>
                            <DashboardChart />
                        </div>

                        {/* Pipeline: Recent Contracts */}
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>Últimos Contratos</span>
                                <Link to="/contracts" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Ver todos</Link>
                            </div>
                            {recentContracts.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No hay contratos todavía
                                </div>
                            ) : (
                                <div>
                                    {recentContracts.map((contract) => (
                                        <Link
                                            key={contract.id}
                                            to={`/contracts/${contract.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.875rem',
                                                padding: '0.875rem 1.25rem',
                                                borderBottom: '1px solid var(--border-light)',
                                                textDecoration: 'none',
                                                color: 'var(--text-main)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.125rem' }}>
                                                    {contract.customers?.[0]?.name || 'Cliente desconocido'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {contract.tariff_versions?.[0]?.suppliers?.[0]?.name || ''}{contract.tariff_versions?.[0]?.tariff_name ? ` · ${contract.tariff_versions[0].tariff_name}` : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                                    {contract.annual_value_eur?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                                </span>
                                                <span style={contractStatusStyle(contract.status)}>
                                                    {contractStatusLabel[contract.status] || contract.status}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="card quick-actions">
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderBottom: '1px solid var(--color-border)',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                            }}>
                                Acciones Rápidas
                            </div>
                            <div style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <Link to="/comparator" className="btn btn-primary btn-sm">
                                    <Search size={14} /> Nueva Comparativa
                                </Link>
                                <Link to="/crm/new" className="btn btn-secondary btn-sm">
                                    <Plus size={14} /> Nuevo Cliente
                                </Link>
                                <Link to="/contracts/new" className="btn btn-secondary btn-sm">
                                    <FileSignature size={14} /> Nuevo Contrato
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <RecentActivity />

                        {/* Navigation Shortcuts */}
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderBottom: '1px solid var(--color-border)',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                background: 'var(--color-background)',
                            }}>
                                Accesos Directos
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Link to="/crm" style={shortcutLinkStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Users size={18} color="var(--color-primary)" />
                                        <span>Gestión de Clientes</span>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </Link>
                                <Link to="/contracts" style={shortcutLinkStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <FileText size={18} color="var(--color-primary)" />
                                        <span>Gestión de Contratos</span>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </Link>
                                <Link to="/admin/tariffs" style={shortcutLinkStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <CheckCircle size={18} color="var(--color-primary)" />
                                        <span>Tarifas y Precios</span>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const shortcutLinkStyle: React.CSSProperties = {
    padding: '0.875rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textDecoration: 'none',
    color: 'var(--text-main)',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderBottom: '1px solid var(--border-light)',
    transition: 'background 0.15s',
    cursor: 'pointer',
}
