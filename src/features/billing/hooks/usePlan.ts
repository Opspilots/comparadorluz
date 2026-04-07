import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Plan, UsageTracking, PlanTier, PlanLimits, PlanFeatures } from '@/shared/types'
import { PLAN_LIMITS, PLAN_FEATURES, isUnderLimit } from '../lib/plans'

// Shape returned by the companies join query
interface CompanyWithPlan {
  id: string
  name: string
  cif: string
  plan_id?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  billing_interval?: string
  plan_expires_at?: string
  trial_ends_at?: string
  plans: Plan | null
}

export function usePlan() {
  // 1. Get current user's company (with plan joined)
  const companyQuery = useQuery({
    queryKey: ['company-billing'],
    queryFn: async (): Promise<CompanyWithPlan | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.company_id) throw new Error('Sin empresa')
      const { data: company } = await supabase
        .from('companies')
        .select('*, plans(*)')
        .eq('id', profile.company_id)
        .maybeSingle()
      return company as CompanyWithPlan | null
    },
    staleTime: 5 * 60 * 1000,
  })

  // 2. Get current month usage
  const periodStart = new Date()
  periodStart.setDate(1)
  const periodStartStr = periodStart.toISOString().split('T')[0]

  const usageQuery = useQuery({
    queryKey: ['usage-tracking', periodStartStr],
    queryFn: async (): Promise<UsageTracking[]> => {
      const companyId = companyQuery.data?.id
      if (!companyId) return []
      const { data } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_start', periodStartStr)
      return (data || []) as UsageTracking[]
    },
    enabled: !!companyQuery.data?.id,
    staleTime: 60 * 1000,
  })

  const company = companyQuery.data
  const plan = company?.plans ?? null
  const tier = (plan?.name ?? 'free') as PlanTier
  const limits: PlanLimits = plan?.limits ?? PLAN_LIMITS[tier]
  const features: PlanFeatures = plan?.features ?? PLAN_FEATURES[tier]
  const usage = usageQuery.data ?? []

  function getUsage(featureKey: string): number {
    return usage.find(u => u.feature_key === featureKey)?.count ?? 0
  }

  function canUseFeature(featureKey: keyof PlanFeatures): boolean {
    return features[featureKey] === true
  }

  function canUseMore(usageKey: string, limitKey: keyof PlanLimits): boolean {
    return isUnderLimit(getUsage(usageKey), limits[limitKey] as number)
  }

  function isExpired(): boolean {
    if (!company?.plan_expires_at) return false
    return new Date(company.plan_expires_at) < new Date()
  }

  return {
    company,
    plan,
    tier,
    limits,
    features,
    usage,
    getUsage,
    canUseFeature,
    canUseMore,
    isExpired,
    loading: companyQuery.isLoading,
    error: companyQuery.error,
    refetch: companyQuery.refetch,
  }
}
