import { useState } from 'react'
import { Activity, RefreshCw, Zap, Wind, Sun, Droplets, Flame } from 'lucide-react'
import { useREDataDemand, useREDataGeneration } from '@/features/integrations/lib/useIntegrations'

interface DataSeries {
    title: string
    type: string
    values: Array<{ value: number; percentage: number; datetime: string }>
}

const GENERATION_ICONS: Record<string, typeof Zap> = {
    'eólica': Wind,
    'solar fotovoltaica': Sun,
    'hidráulica': Droplets,
    'nuclear': Zap,
    'ciclo combinado': Flame,
    'cogeneración': Flame,
}

const GENERATION_COLORS: Record<string, string> = {
    'eólica': '#06b6d4',
    'solar fotovoltaica': '#f59e0b',
    'hidráulica': '#3b82f6',
    'nuclear': '#8b5cf6',
    'ciclo combinado': '#ef4444',
    'cogeneración': '#f97316',
    'carbón': '#6b7280',
    'solar térmica': '#eab308',
    'otras renovables': '#10b981',
    'residuos renovables': '#14b8a6',
    'residuos no renovables': '#78716c',
    'turbinación bombeo': '#6366f1',
    'fuel + gas': '#dc2626',
}

function getColorForSource(title: string): string {
    const lower = title.toLowerCase()
    for (const [key, color] of Object.entries(GENERATION_COLORS)) {
        if (lower.includes(key)) return color
    }
    return '#94a3b8'
}

function getIconForSource(title: string) {
    const lower = title.toLowerCase()
    for (const [key, Icon] of Object.entries(GENERATION_ICONS)) {
        if (lower.includes(key)) return Icon
    }
    return Zap
}

export function EnergyMixWidget() {
    const [tab, setTab] = useState<'generation' | 'demand'>('generation')
    const today = new Date().toISOString().split('T')[0]

    const { data: genData, isLoading: genLoading } = useREDataGeneration(today, today)
    const { data: demandData, isLoading: demandLoading } = useREDataDemand(today, today)

    const isLoading = tab === 'generation' ? genLoading : demandLoading
    const rawData = (tab === 'generation' ? genData : demandData) as DataSeries[] | undefined

    // For generation: aggregate latest values per source and sort by percentage
    const generationSources = (() => {
        if (tab !== 'generation' || !rawData) return []
        return rawData
            .filter(s => s.values && s.values.length > 0)
            .map(s => {
                const latest = s.values[s.values.length - 1]
                return {
                    title: s.title,
                    value: Math.round(latest.value),
                    percentage: Math.round(latest.percentage * 10) / 10,
                    color: getColorForSource(s.title),
                }
            })
            .filter(s => s.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage)
    })()

    // For demand: show the evolution
    const demandSeries = (() => {
        if (tab !== 'demand' || !rawData) return null
        const main = rawData.find(s => s.title?.toLowerCase().includes('demanda real') || s.type === 'Demanda real')
            ?? rawData[0]
        if (!main?.values?.length) return null
        const values = main.values.map(v => ({
            hour: new Date(v.datetime).getHours(),
            mw: Math.round(v.value),
        }))
        const max = Math.max(...values.map(v => v.mw))
        const min = Math.min(...values.map(v => v.mw))
        const current = values[values.length - 1]
        return { values, max, min, current, title: main.title }
    })()

    const renewablePercent = generationSources
        .filter(s => {
            const l = s.title.toLowerCase()
            return l.includes('eólica') || l.includes('solar') || l.includes('hidráulica') || l.includes('renovable')
        })
        .reduce((sum, s) => sum + s.percentage, 0)

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header with tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
                <button
                    onClick={() => setTab('generation')}
                    style={{
                        flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: tab === 'generation' ? 'var(--background)' : 'transparent',
                        color: tab === 'generation' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: tab === 'generation' ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                >
                    Mix Energético
                </button>
                <button
                    onClick={() => setTab('demand')}
                    style={{
                        flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: tab === 'demand' ? 'var(--background)' : 'transparent',
                        color: tab === 'demand' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: tab === 'demand' ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                >
                    Demanda
                </button>
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <RefreshCw size={14} className="animate-spin inline-block mr-1" /> Cargando datos REE...
                    </div>
                ) : tab === 'generation' && generationSources.length > 0 ? (
                    <>
                        {/* Renewable badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px',
                                background: renewablePercent > 50 ? '#ecfdf5' : '#fffbeb',
                                color: renewablePercent > 50 ? '#047857' : '#b45309',
                            }}>
                                {Math.round(renewablePercent)}% Renovable
                            </span>
                        </div>

                        {/* Stacked bar */}
                        <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                            {generationSources.map((s) => (
                                <div
                                    key={s.title}
                                    style={{
                                        width: `${s.percentage}%`,
                                        background: s.color,
                                        minWidth: s.percentage > 1 ? '2px' : '0',
                                    }}
                                    title={`${s.title}: ${s.percentage}%`}
                                />
                            ))}
                        </div>

                        {/* Source list (top 6) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                            {generationSources.slice(0, 6).map((s) => {
                                const Icon = getIconForSource(s.title)
                                return (
                                    <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
                                        <Icon size={10} style={{ color: s.color, flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.title}
                                        </span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto', flexShrink: 0 }}>
                                            {s.percentage}%
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : tab === 'demand' && demandSeries ? (
                    <>
                        {/* Current demand */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                            <div>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {demandSeries.current?.mw.toLocaleString('es-ES')}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>MW</span>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)' }}>
                                {demandSeries.title}
                            </span>
                        </div>

                        {/* Demand chart */}
                        <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '48px', marginBottom: '0.5rem' }}>
                            {demandSeries.values.map((v) => {
                                const pct = ((v.mw - demandSeries.min * 0.9) / (demandSeries.max - demandSeries.min * 0.9)) * 100
                                const isLast = v.hour === demandSeries.current?.hour
                                return (
                                    <div
                                        key={v.hour}
                                        style={{
                                            flex: 1, height: `${Math.max(pct, 4)}%`, minWidth: '2px',
                                            background: isLast ? 'var(--primary)' : '#93c5fd',
                                            borderRadius: '2px', opacity: isLast ? 1 : 0.6,
                                        }}
                                        title={`${v.hour}:00 — ${v.mw.toLocaleString('es-ES')} MW`}
                                    />
                                )
                            })}
                        </div>

                        {/* Min/Max */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-subtle)' }}>
                            <span>Min: {demandSeries.min.toLocaleString('es-ES')} MW</span>
                            <span>Max: {demandSeries.max.toLocaleString('es-ES')} MW</span>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Activity size={16} className="inline-block mr-1" />
                        No hay datos disponibles. Conecta REE REData en Integraciones.
                    </div>
                )}
            </div>
        </div>
    )
}
