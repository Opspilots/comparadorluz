import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { MetricCard } from '../components/MetricCard'
import { DashboardChart } from '../components/DashboardChart'
import { RecentActivity } from '../components/RecentActivity'

import { Users, FileText, CheckCircle, Plus, Search, FileSignature, Calendar, ArrowRight } from 'lucide-react'

export function DashboardPage() {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalContracts: 0,
        activeContracts: 0,
        monthlyComparisons: [] as { month: string; value: number }[]
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboardStats = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) throw new Error('No company')
            const cid = profile.company_id

            const [customersRes, contractsRes, activeContractsRes] = await Promise.all([
                supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', cid),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'active')
            ])

            if (customersRes.error) throw customersRes.error
            if (contractsRes.error) throw contractsRes.error
            if (activeContractsRes.error) throw activeContractsRes.error

            setStats({
                totalCustomers: customersRes.count || 0,
                totalContracts: contractsRes.count || 0,
                activeContracts: activeContractsRes.count || 0,
                monthlyComparisons: []
            })
        } catch (err) {
            console.error('Error fetching dashboard stats:', err)
            setError('No se pudieron cargar las estadisticas. Comprueba tu conexion.')
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
                <button className="btn btn-secondary btn-sm">
                    <Calendar size={14} /> Ultimos 30 dias
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="metric-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
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
                    subtitle="Historico completo"
                />
                <MetricCard
                    title="Contratos Activos"
                    value={stats.activeContracts}
                    icon={<CheckCircle size={20} />}
                    trend="neutral"
                    subtitle="En vigor"
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

                        {/* Quick Actions */}
                        <div className="card quick-actions">
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderBottom: '1px solid var(--color-border)',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                            }}>
                                Acciones Rapidas
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
                                        <span>Gestion de Clientes</span>
                                    </div>
                                    <ArrowRight size={16} color="var(--text-muted)" />
                                </Link>
                                <Link to="/contracts" style={shortcutLinkStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <FileText size={18} color="var(--color-primary)" />
                                        <span>Gestion de Contratos</span>
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
    cursor: 'pointer'
}
