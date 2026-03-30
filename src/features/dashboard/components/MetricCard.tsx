import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
    title: string
    value: number | string
    previousValue?: number
    icon?: React.ReactNode
    format?: 'number' | 'currency' | 'percentage'
    trend?: 'up' | 'down' | 'neutral'
    subtitle?: string
}

export function MetricCard({ title, value, previousValue, icon, format = 'number', trend, subtitle }: MetricCardProps) {

    const formatValue = (val: number | string) => {
        if (typeof val === 'string') return val

        switch (format) {
            case 'currency':
                return `${Math.round(val)}€`
            case 'percentage':
                return `${val.toFixed(1)}%`
            default:
                return val.toLocaleString('es-ES')
        }
    }

    const calculateChange = () => {
        if (previousValue === null || previousValue === undefined || typeof value !== 'number') return null

        const change = ((value - previousValue) / previousValue) * 100
        return change
    }

    const change = calculateChange()

    const getTrendColor = () => {
        if (!trend) return 'var(--text-muted)'
        switch (trend) {
            case 'up':
                return '#16a34a'
            case 'down':
                return '#dc2626'
            default:
                return 'var(--text-muted)'
        }
    }

    const getTrendIcon = () => {
        if (!trend || trend === 'neutral') return <Minus size={16} />
        return trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />
    }

    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {title}
                </div>
                {icon && (
                    <div style={{ color: 'var(--color-primary)', opacity: 0.7, lineHeight: 0 }}>
                        {icon}
                    </div>
                )}
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {formatValue(value)}
            </div>

            {subtitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {subtitle}
                </div>
            )}

            {change !== null && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    color: getTrendColor()
                }}>
                    {getTrendIcon()}
                    <span>{Math.abs(change).toFixed(1)}% vs mes anterior</span>
                </div>
            )}
        </div>
    )
}
