import type { PlanLimits } from '@/shared/types'
import { usePlan } from '../hooks/usePlan'
import { formatLimit, getUsagePercent } from '../lib/plans'

interface UsageMeterProps {
  featureKey: string
  limitKey: keyof PlanLimits
  label: string
}

function getBarColor(percent: number): string {
  if (percent >= 85) return '#ef4444'
  if (percent >= 60) return '#f59e0b'
  return '#10b981'
}

export function UsageMeter({ featureKey, limitKey, label }: UsageMeterProps) {
  const { getUsage, limits } = usePlan()
  const used = getUsage(featureKey)
  const limit = limits[limitKey] as number
  const percent = getUsagePercent(used, limit)
  const barColor = getBarColor(percent)

  // Not included in plan
  if (limit === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b' }}>{label}</span>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
            No incluido en tu plan
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: '#fee2e2',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              background: '#ef4444',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>
    )
  }

  // Unlimited
  if (limit === -1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b' }}>{label}</span>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Ilimitado</span>
        </div>
        <div
          style={{
            height: '6px',
            background: '#d1fae5',
            borderRadius: '999px',
          }}
        />
      </div>
    )
  }

  // Normal metered usage
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b' }}>{label}</span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: percent >= 85 ? '#ef4444' : percent >= 60 ? '#d97706' : '#0f172a',
          }}
        >
          {used.toLocaleString('es-ES')} / {formatLimit(limit)}
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: '#f1f5f9',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}
