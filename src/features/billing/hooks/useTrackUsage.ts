import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'

interface TrackUsageArgs {
  featureKey: string
  amount?: number
}

export function useTrackUsage() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ featureKey, amount = 1 }: TrackUsageArgs): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.company_id) return
      await supabase.rpc('increment_usage', {
        p_company_id: profile.company_id,
        p_feature_key: featureKey,
        p_amount: amount,
      })
    },
    onSuccess: () => {
      const periodStart = new Date()
      periodStart.setDate(1)
      void queryClient.invalidateQueries({
        queryKey: ['usage-tracking', periodStart.toISOString().split('T')[0]],
      })
    },
  })

  return (featureKey: string, amount = 1) => mutation.mutate({ featureKey, amount })
}
