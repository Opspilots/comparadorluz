import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/shared/lib/supabase'

type ChartType = 'contracts' | 'customers'

export function DashboardChart() {
    const [chartType, setChartType] = useState<ChartType>('contracts')
    const [data, setData] = useState<{ name: string; value: number }[]>([])
    const [loading, setLoading] = useState(true)



    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) return

            // The table name is directly derived from chartType
            const { data: result, error } = await supabase
                .from(chartType) // Changed from 'table' to 'chartType'
                .select('created_at')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: true })

            if (error) throw error

            // Group by month
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                return {
                    month: d.getMonth(),
                    year: d.getFullYear(),
                    label: months[d.getMonth()]
                }
            }).reverse() // Reverse to get chronological order

            const formattedData = last6Months.map(m => {
                // Ensure result is not null before filtering
                const count = result?.filter(r => {
                    const d = new Date(r.created_at)
                    return d.getMonth() === m.month && d.getFullYear() === m.year
                }).length || 0 // Default to 0 if result is null or no matches

                return {
                    name: m.label,
                    value: count
                }
            })

            setData(formattedData)
        } catch (error) {
            console.error('Error fetching chart data:', error)
        } finally {
            setLoading(false) // Corrected from setLoading(true)
        }
    }, [chartType]) // Dependency array for useCallback

    useEffect(() => {
        fetchData()
    }, [fetchData]) // Dependency array for useEffect now includes fetchData

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Evolución de {chartType === 'contracts' ? 'Contratos' : 'Clientes'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-background)', padding: '0.25rem', borderRadius: '6px' }}>
                    <button
                        onClick={() => setChartType('contracts')}
                        style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: chartType === 'contracts' ? 'white' : 'transparent',
                            boxShadow: chartType === 'contracts' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            color: chartType === 'contracts' ? 'var(--color-primary)' : 'var(--text-muted)',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Contratos
                    </button>
                    <button
                        onClick={() => setChartType('customers')}
                        style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: chartType === 'customers' ? 'white' : 'transparent',
                            boxShadow: chartType === 'customers' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            color: chartType === 'customers' ? 'var(--color-primary)' : 'var(--text-muted)',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Clientes
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, padding: '1.5rem', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? (
                    <div style={{ color: 'var(--text-muted)' }}>Cargando datos...</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                allowDecimals={false}
                            />
                            <CartesianGrid vertical={false} stroke="var(--border-light)" />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                name={chartType === 'contracts' ? 'Contratos' : 'Clientes'}
                                stroke="var(--color-primary)"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
