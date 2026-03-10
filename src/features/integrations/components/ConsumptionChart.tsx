import { useMemo } from 'react'
import { BarChart3, Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import type { ConsumptionData } from '@/shared/types'

interface ConsumptionChartProps {
    data: ConsumptionData[]
    cups: string
}

interface DailyAggregate {
    date: string
    total: number
    p1: number
    p2: number
    p3: number
}

export function ConsumptionChart({ data, cups }: ConsumptionChartProps) {
    const { dailyData, stats, periodBreakdown } = useMemo(() => {
        if (data.length === 0) return { dailyData: [], stats: null, periodBreakdown: null }

        // Aggregate by day
        const byDay = new Map<string, DailyAggregate>()
        for (const row of data) {
            const existing = byDay.get(row.date) ?? { date: row.date, total: 0, p1: 0, p2: 0, p3: 0 }
            existing.total += row.consumption_kwh
            if (row.period === 'P1') existing.p1 += row.consumption_kwh
            else if (row.period === 'P2') existing.p2 += row.consumption_kwh
            else existing.p3 += row.consumption_kwh
            byDay.set(row.date, existing)
        }

        const sorted = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))

        // Stats
        const totalKwh = sorted.reduce((s, d) => s + d.total, 0)
        const avgDaily = sorted.length > 0 ? totalKwh / sorted.length : 0
        const annualEstimate = avgDaily * 365

        // Period breakdown
        const totalP1 = sorted.reduce((s, d) => s + d.p1, 0)
        const totalP2 = sorted.reduce((s, d) => s + d.p2, 0)
        const totalP3 = sorted.reduce((s, d) => s + d.p3, 0)
        const periodTotal = totalP1 + totalP2 + totalP3

        return {
            dailyData: sorted.slice(-30), // Last 30 days
            stats: {
                totalKwh: Math.round(totalKwh),
                avgDaily: Math.round(avgDaily * 10) / 10,
                annualEstimate: Math.round(annualEstimate),
                days: sorted.length,
                maxDaily: Math.round(Math.max(...sorted.map(d => d.total)) * 10) / 10,
                minDaily: Math.round(Math.min(...sorted.map(d => d.total)) * 10) / 10,
            },
            periodBreakdown: periodTotal > 0 ? {
                p1Pct: Math.round((totalP1 / periodTotal) * 100),
                p2Pct: Math.round((totalP2 / periodTotal) * 100),
                p3Pct: Math.round((totalP3 / periodTotal) * 100),
                p1Kwh: Math.round(totalP1),
                p2Kwh: Math.round(totalP2),
                p3Kwh: Math.round(totalP3),
            } : null,
        }
    }, [data])

    if (data.length === 0) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <BarChart3 size={20} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">No hay datos de consumo para {cups}</p>
            </div>
        )
    }

    const maxValue = Math.max(...dailyData.map(d => d.total), 1)

    return (
        <div className="flex flex-col gap-3">
            {/* Stats row */}
            {stats && (
                <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <span className="block text-[10px] font-semibold text-blue-600 uppercase">Consumo total</span>
                        <span className="block text-sm font-bold text-blue-900">{stats.totalKwh.toLocaleString('es-ES')} kWh</span>
                        <span className="block text-[10px] text-blue-500">{stats.days} dias</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                        <span className="block text-[10px] font-semibold text-emerald-600 uppercase">Est. anual</span>
                        <span className="block text-sm font-bold text-emerald-900">{stats.annualEstimate.toLocaleString('es-ES')} kWh</span>
                        <span className="block text-[10px] text-emerald-500">proyeccion</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                        <span className="block text-[10px] font-semibold text-amber-600 uppercase">Media diaria</span>
                        <span className="block text-sm font-bold text-amber-900">{stats.avgDaily} kWh</span>
                        <span className="block text-[10px] text-amber-500">por dia</span>
                    </div>
                    <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg text-center">
                        <span className="block text-[10px] font-semibold text-violet-600 uppercase">Rango</span>
                        <span className="block text-xs font-bold text-violet-900 flex items-center justify-center gap-1">
                            <TrendingDown size={10} />{stats.minDaily}
                            <span className="text-violet-400 mx-0.5">-</span>
                            <TrendingUp size={10} />{stats.maxDaily}
                        </span>
                        <span className="block text-[10px] text-violet-500">kWh/dia</span>
                    </div>
                </div>
            )}

            {/* Period breakdown bar */}
            {periodBreakdown && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Distribucion por periodos</span>
                    <div className="flex h-5 rounded-md overflow-hidden border border-slate-200">
                        <div
                            className="bg-red-400 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ width: `${periodBreakdown.p1Pct}%` }}
                            title={`P1 Punta: ${periodBreakdown.p1Kwh} kWh`}
                        >
                            {periodBreakdown.p1Pct > 10 && `P1 ${periodBreakdown.p1Pct}%`}
                        </div>
                        <div
                            className="bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ width: `${periodBreakdown.p2Pct}%` }}
                            title={`P2 Llano: ${periodBreakdown.p2Kwh} kWh`}
                        >
                            {periodBreakdown.p2Pct > 10 && `P2 ${periodBreakdown.p2Pct}%`}
                        </div>
                        <div
                            className="bg-emerald-400 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ width: `${periodBreakdown.p3Pct}%` }}
                            title={`P3 Valle: ${periodBreakdown.p3Kwh} kWh`}
                        >
                            {periodBreakdown.p3Pct > 10 && `P3 ${periodBreakdown.p3Pct}%`}
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> P1 Punta: {periodBreakdown.p1Kwh.toLocaleString('es-ES')} kWh</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> P2 Llano: {periodBreakdown.p2Kwh.toLocaleString('es-ES')} kWh</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> P3 Valle: {periodBreakdown.p3Kwh.toLocaleString('es-ES')} kWh</span>
                    </div>
                </div>
            )}

            {/* Daily bar chart */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase">
                    <Calendar size={10} />
                    Ultimos {dailyData.length} dias
                </div>
                <div className="flex items-end gap-[2px] h-16 bg-slate-50 rounded-md p-1 border border-slate-100">
                    {dailyData.map((d) => {
                        const pct = (d.total / maxValue) * 100
                        const isHigh = d.total > (stats?.avgDaily ?? 0) * 1.3
                        return (
                            <div
                                key={d.date}
                                className={`flex-1 rounded-sm ${isHigh ? 'bg-amber-400' : 'bg-blue-400'} hover:opacity-80 transition-opacity cursor-help`}
                                style={{ height: `${Math.max(pct, 3)}%`, minWidth: '3px' }}
                                title={`${new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: ${Math.round(d.total * 10) / 10} kWh`}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
