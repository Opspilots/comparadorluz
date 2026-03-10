import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { useMarketPrices } from '@/features/integrations/lib/useIntegrations'
import type { MarketPrice } from '@/shared/types'

export function MarketPriceWidget() {
    const today = new Date().toISOString().split('T')[0]
    const { data: prices, isLoading, isError } = useMarketPrices('pvpc', today, today)

    const stats = useMemo(() => {
        if (!prices || prices.length === 0) return null

        const sorted = [...prices].sort((a, b) => a.hour - b.hour)
        const pricesEur = sorted.map(p => p.price_eur_mwh)
        const avg = pricesEur.reduce((s, p) => s + p, 0) / pricesEur.length
        const min = Math.min(...pricesEur)
        const max = Math.max(...pricesEur)
        const currentHour = new Date().getHours()
        const current = sorted.find(p => p.hour === currentHour)

        // Period averages (2.0TD)
        const p1Hours = sorted.filter(p => (p.hour >= 10 && p.hour < 14) || (p.hour >= 18 && p.hour < 22))
        const p2Hours = sorted.filter(p => (p.hour >= 8 && p.hour < 10) || (p.hour >= 14 && p.hour < 18) || (p.hour >= 22 && p.hour < 24))
        const p3Hours = sorted.filter(p => p.hour >= 0 && p.hour < 8)

        const avgPeriod = (arr: MarketPrice[]) => arr.length > 0
            ? arr.reduce((s, p) => s + p.price_eur_mwh, 0) / arr.length
            : 0

        return {
            current: current?.price_eur_mwh ?? null,
            currentHour,
            avg: Math.round(avg * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            p1Avg: Math.round(avgPeriod(p1Hours) * 100) / 100,
            p2Avg: Math.round(avgPeriod(p2Hours) * 100) / 100,
            p3Avg: Math.round(avgPeriod(p3Hours) * 100) / 100,
            hourly: sorted,
        }
    }, [prices])

    if (isLoading) {
        return (
            <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <RefreshCw size={14} className="animate-spin" /> Cargando precios de mercado...
                </div>
            </div>
        )
    }

    if (isError || !stats) {
        return (
            <div className="card" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    No hay datos PVPC disponibles para hoy.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', margin: '0.25rem 0 0 0' }}>
                    Conecta REE e-sios en Integraciones para obtener precios de mercado.
                </p>
            </div>
        )
    }

    const maxVal = Math.max(...stats.hourly.map(h => h.price_eur_mwh), 1)

    const trendIcon = stats.current !== null
        ? stats.current > stats.avg
            ? <TrendingUp size={14} style={{ color: '#ef4444' }} />
            : stats.current < stats.avg
                ? <TrendingDown size={14} style={{ color: '#10b981' }} />
                : <Minus size={14} style={{ color: '#64748b' }} />
        : null

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Precio PVPC Hoy
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                        {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                </div>
                {stats.current !== null && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {stats.current.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EUR/MWh</span>
                        {trendIcon}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>
                            Hora {stats.currentHour}:00
                        </span>
                    </div>
                )}
            </div>

            {/* Hourly price chart */}
            <div style={{ padding: '0.75rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '48px' }}>
                    {stats.hourly.map((h) => {
                        const pct = (h.price_eur_mwh / maxVal) * 100
                        const isCurrentHour = h.hour === stats.currentHour
                        const isPunta = (h.hour >= 10 && h.hour < 14) || (h.hour >= 18 && h.hour < 22)
                        const isValle = h.hour >= 0 && h.hour < 8
                        const color = isPunta ? '#ef4444' : isValle ? '#10b981' : '#f59e0b'
                        return (
                            <div
                                key={h.hour}
                                style={{
                                    flex: 1,
                                    height: `${Math.max(pct, 4)}%`,
                                    background: color,
                                    opacity: isCurrentHour ? 1 : 0.5,
                                    borderRadius: '2px',
                                    minWidth: '2px',
                                    border: isCurrentHour ? '1px solid var(--text-primary)' : 'none',
                                }}
                                title={`${h.hour}:00 — ${h.price_eur_mwh.toFixed(2)} EUR/MWh`}
                            />
                        )
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>0h</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>12h</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>23h</span>
                </div>
            </div>

            {/* Period averages */}
            <div style={{ padding: '0.5rem 1.25rem 1rem', display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, padding: '0.4rem', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase' }}>P1 Punta</span>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#991b1b' }}>{stats.p1Avg}</span>
                </div>
                <div style={{ flex: 1, padding: '0.4rem', background: '#fffbeb', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase' }}>P2 Llano</span>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>{stats.p2Avg}</span>
                </div>
                <div style={{ flex: 1, padding: '0.4rem', background: '#ecfdf5', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>P3 Valle</span>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#065f46' }}>{stats.p3Avg}</span>
                </div>
            </div>

            {/* Summary */}
            <div style={{ padding: '0.5rem 1.25rem 0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                <span>Min: {stats.min} EUR/MWh</span>
                <span>Media: {stats.avg} EUR/MWh</span>
                <span>Max: {stats.max} EUR/MWh</span>
            </div>
        </div>
    )
}
