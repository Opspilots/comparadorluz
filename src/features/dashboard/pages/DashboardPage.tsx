import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { MetricCard } from '../components/MetricCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, FileText, CheckCircle, Plus, Search, FileSignature } from 'lucide-react'

export function DashboardPage() {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalContracts: 0,
        activeContracts: 0,
        monthlyComparisons: [] as any[]
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

            // Simple mock aggregation for the chart
            // (In production, use a dedicated RPC or proper aggregation)
            const mockChartData = [
                { name: 'Ene', comparisons: 4 },
                { name: 'Feb', comparisons: 7 },
                { name: 'Mar', comparisons: 5 },
                { name: 'Abr', comparisons: 12 },
                { name: 'May', comparisons: 9 },
                { name: 'Jun', comparisons: 15 },
            ]

            setStats({
                totalCustomers: customersRes.count || 0,
                totalContracts: contractsRes.count || 0,
                activeContracts: activeContractsRes.count || 0,
                monthlyComparisons: mockChartData
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
        <div className="animate-fade-in">


            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Action Area & Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Quick Actions */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Acciones Rápidas</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link to="/comparator" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Search size={18} /> Nueva Comparativa
                            </Link>
                            <Link to="/crm/new" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={18} /> Nuevo Cliente
                            </Link>
                            <Link to="/contracts/new" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSignature size={18} /> Nuevo Contrato
                            </Link>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="card" style={{ padding: '2rem', minHeight: '400px' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Actividad de Comparativas</h2>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.monthlyComparisons}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f4f4f5' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="comparisons" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Secondary Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ background: '#0a0a0a', color: 'white', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>Navegación</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Link to="/crm" style={sidebarLinkStyle}>
                                <Users size={16} /> Ver Clientes
                            </Link>
                            <Link to="/contracts" style={sidebarLinkStyle}>
                                <FileText size={16} /> Ver Contratos
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const sidebarLinkStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '6px',
    transition: 'background 0.2s',
    cursor: 'pointer'
}
