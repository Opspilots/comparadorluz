import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/shared/lib/supabase'

type ChartType = 'contracts' | 'customers'

export function DashboardChart() {
    const [chartType, setChartType] = useState<ChartType>('contracts')
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [chartType])

    const fetchData = async () => {
        setLoading(true)
        try {
            const table = chartType === 'contracts' ? 'contracts' : 'customers'
            // Get data from the last 6 months
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
            sixMonthsAgo.setDate(1) // Start of the month

            const { data: result, error } = await supabase
                .from(table)
                .select('created_at')
                .gte('created_at', sixMonthsAgo.toISOString())
                .order('created_at', { ascending: true })

            if (error) throw error

            // Process data to group by month
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
            const groupedData = new Map<string, number>()

            // Initialize last 6 months with 0
            for (let i = 0; i < 6; i++) {
                const d = new Date()
                d.setMonth(d.getMonth() - 5 + i)
                const monthKey = monthNames[d.getMonth()]
                groupedData.set(monthKey, 0)
            }

            result?.forEach(item => {
                const date = new Date(item.created_at)
                const monthKey = monthNames[date.getMonth()]
                if (groupedData.has(monthKey)) {
                    groupedData.set(monthKey, (groupedData.get(monthKey) || 0) + 1)
                }
            })

            const formattedData = Array.from(groupedData.entries()).map(([name, value]) => ({
                name,
                value
            }))

            setData(formattedData)
        } catch (error) {
            console.error('Error fetching chart data:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Evolución de {chartType === 'contracts' ? 'Contratos' : 'Clientes'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--background)', padding: '0.25rem', borderRadius: '6px' }}>
                    <button
                        onClick={() => setChartType('contracts')}
                        style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: chartType === 'contracts' ? 'white' : 'transparent',
                            boxShadow: chartType === 'contracts' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            color: chartType === 'contracts' ? 'var(--primary)' : 'var(--text-muted)',
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
                            color: chartType === 'customers' ? 'var(--primary)' : 'var(--text-muted)',
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
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
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
                                    border: '1px solid var(--border)',
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
                                stroke="var(--primary)"
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
