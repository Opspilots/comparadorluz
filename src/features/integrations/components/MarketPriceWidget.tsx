import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MarketPrice } from '@/shared/types'

interface MarketPriceWidgetProps {
    prices: MarketPrice[]
}

export function MarketPriceWidget({ prices }: MarketPriceWidgetProps) {
    const stats = useMemo(() => {
        if (!prices || prices.length === 0) return null

        // Group by date
        const byDate = new Map<string, MarketPrice[]>()
        for (const p of prices) {
            const arr = byDate.get(p.price_date) ?? []
            arr.push(p)
            byDate.set(p.price_date, arr)
        }

        // Get the most recent date
        const dates = Array.from(byDate.keys()).sort().reverse()
        const latestDate = dates[0]
        const latestPrices = byDate.get(latestDate) ?? []

        // Calculate stats
        const values = latestPrices.map((p) => p.price_eur_mwh)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const min = Math.min(...values)
        const max = Math.max(...values)

        // Current hour price
        const currentHour = new Date().getHours()
        const currentPrice = latestPrices.find((p) => p.hour === currentHour)

        // Previous date for comparison
        const prevDate = dates[1]
        let prevAvg: number | null = null
        if (prevDate) {
            const prevPrices = byDate.get(prevDate) ?? []
            const prevValues = prevPrices.map((p) => p.price_eur_mwh)
            prevAvg = prevValues.reduce((a, b) => a + b, 0) / prevValues.length
        }

        const change = prevAvg !== null ? ((avg - prevAvg) / prevAvg) * 100 : null

        // Hourly chart data (24 bars)
        const hourlyData = Array.from({ length: 24 }, (_, h) => {
            const hourPrice = latestPrices.find((p) => p.hour === h)
            return {
                hour: h,
                price: hourPrice?.price_eur_mwh ?? 0,
            }
        })

        return { latestDate, avg, min, max, currentPrice, change, hourlyData, currentHour }
    }, [prices])

    if (!stats) return null

    const maxBarPrice = Math.max(...stats.hourlyData.map((d) => d.price), 1)

    return (
        <div
            className="bg-white rounded-[14px] border border-slate-200 p-5"
            style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                        Precios PVPC hoy
                    </h3>
                    <p className="text-xs text-slate-400">
                        {new Date(stats.latestDate + 'T00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                        })}
                    </p>
                </div>

                {/* Change badge */}
                {stats.change !== null && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        stats.change > 0
                            ? 'bg-red-50 text-red-700'
                            : stats.change < 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                    }`}>
                        {stats.change > 0 ? <TrendingUp size={12} /> : stats.change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                        {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)}% vs ayer
                    </span>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Ahora</p>
                    <p className="text-lg font-bold text-slate-900">
                        {stats.currentPrice ? stats.currentPrice.price_eur_mwh.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">EUR/MWh</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Media</p>
                    <p className="text-lg font-bold text-blue-600">
                        {stats.avg.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-slate-400">EUR/MWh</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-500 mb-0.5">Min</p>
                    <p className="text-lg font-bold text-emerald-600">
                        {stats.min.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-slate-400">EUR/MWh</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-red-400 mb-0.5">Max</p>
                    <p className="text-lg font-bold text-red-600">
                        {stats.max.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-slate-400">EUR/MWh</p>
                </div>
            </div>

            {/* Hourly bar chart */}
            <div className="flex items-end gap-[2px] h-16">
                {stats.hourlyData.map((d) => {
                    const heightPct = Math.max((d.price / maxBarPrice) * 100, 2)
                    const isCurrent = d.hour === stats.currentHour
                    const isExpensive = d.price > stats.avg * 1.2
                    const isCheap = d.price < stats.avg * 0.8

                    return (
                        <div
                            key={d.hour}
                            className="flex-1 group relative cursor-default"
                            style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
                        >
                            <div
                                className={`w-full rounded-t-sm transition-colors ${
                                    isCurrent
                                        ? 'bg-blue-600'
                                        : isExpensive
                                            ? 'bg-red-300'
                                            : isCheap
                                                ? 'bg-emerald-300'
                                                : 'bg-slate-200'
                                }`}
                                style={{ height: `${heightPct}%` }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                    {d.hour}:00 — {d.price.toFixed(1)} EUR/MWh
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Hour labels */}
            <div className="flex gap-[2px] mt-1">
                {stats.hourlyData.map((d) => (
                    <div key={d.hour} className="flex-1 text-center">
                        {d.hour % 4 === 0 && (
                            <span className="text-[8px] text-slate-400">{d.hour}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
