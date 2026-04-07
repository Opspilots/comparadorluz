import type { PlanTier } from '@/shared/types'
import { PLAN_COLORS, PLAN_DISPLAY } from '../lib/plans'

interface PlanBadgeProps {
  tier: PlanTier
  size?: 'sm' | 'md'
}

export function PlanBadge({ tier, size = 'md' }: PlanBadgeProps) {
  const colors = PLAN_COLORS[tier]
  const label = PLAN_DISPLAY[tier]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: '999px',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
