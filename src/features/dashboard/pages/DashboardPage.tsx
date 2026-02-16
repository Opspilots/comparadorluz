import { useState, useEffect } from 'react'
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

    useEffect(() => {
        fetchDashboardStats()
    }, [])

    const fetchDashboardStats = async () => {
        try {
            const [customersRes, contractsRes, activeContractsRes] = await Promise.all([
                supabase.from('customers').select('id', { count: 'exact', head: true }),
                supabase.from('contracts').select('id', { count: 'exact', head: true }),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active')
            ])

            setStats({
                totalCustomers: customersRes.count || 0,
                totalContracts: contractsRes.count || 0,
                activeContracts: activeContractsRes.count || 0,
                monthlyComparisons: []
            })
        } catch (error) {
            console.error('Error fetching dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                Cargando panel...
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Panel de Control</h1>
                <button className="btn btn-secondary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} /> Últimos 30 días
                </button>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
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
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Data Chart */}
                    <div style={{ height: '400px' }}>
                        <DashboardChart />
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link to="/comparator" className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                                <Search size={16} /> Nueva Comparativa
                            </Link>
                            <Link to="/crm/new" className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                                <Plus size={16} /> Nuevo Cliente
                            </Link>
                            <Link to="/contracts/new" className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                                <FileSignature size={16} /> Nuevo Contrato
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Recent Activity */}
                    <RecentActivity />

                    {/* Navigation Shortcuts */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Link to="/crm" style={shortcutLinkStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Users size={18} color="var(--primary)" />
                                    <span>Gestión de Clientes</span>
                                </div>
                                <ArrowRight size={16} color="var(--text-muted)" />
                            </Link>
                            <Link to="/contracts" style={shortcutLinkStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <FileText size={18} color="var(--primary)" />
                                    <span>Gestión de Contratos</span>
                                </div>
                                <ArrowRight size={16} color="var(--text-muted)" />
                            </Link>
                            <Link to="/admin/tariffs" style={shortcutLinkStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <CheckCircle size={18} color="var(--primary)" />
                                    <span>Tarifas y Precios</span>
                                </div>
                                <ArrowRight size={16} color="var(--text-muted)" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const shortcutLinkStyle: React.CSSProperties = {
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textDecoration: 'none',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    fontWeight: 500,
    borderBottom: '1px solid var(--border-light)',
    transition: 'background 0.2s',
    cursor: 'pointer'
}
