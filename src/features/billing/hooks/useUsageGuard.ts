import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { usePlan } from './usePlan'
import { USAGE_FEATURE_KEYS, formatLimit } from '../lib/plans'

export function useUsageGuard() {
  const { canUseMore, getUsage, limits, tier } = usePlan()
  const { toast } = useToast()
  const navigate = useNavigate()

  function checkUsage(featureKey: string): boolean {
    const meta = USAGE_FEATURE_KEYS[featureKey]
    if (!meta) return true

    const allowed = canUseMore(featureKey, meta.limitKey)
    if (allowed) return true

    const limit = limits[meta.limitKey] as number
    const used = getUsage(featureKey)

    if (limit === 0) {
      toast({
        variant: 'destructive',
        title: `${meta.label} no disponible`,
        description: `Tu plan ${tier === 'free' ? 'Gratis' : 'actual'} no incluye ${meta.label.toLowerCase()}. Actualiza tu plan para acceder.`,
      })
    } else {
      toast({
        variant: 'destructive',
        title: `Límite de ${meta.label.toLowerCase()} alcanzado`,
        description: `Has usado ${used} de ${formatLimit(limit)} este mes. Actualiza tu plan para continuar.`,
      })
    }

    return false
  }

  function goToUpgrade() {
    navigate('/settings/subscription')
  }

  return { checkUsage, goToUpgrade }
}
