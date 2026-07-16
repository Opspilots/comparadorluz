import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Company } from '@/shared/types'

export interface CompanyBrandingData {
    company: Company | null
    userRole: string | null
}

/**
 * Hook compartido para obtener los datos de marca (nombre, logo, colores) de la
 * empresa del usuario autenticado. Usa un queryKey estable (`company-branding`)
 * para que React Query deduplique la petición entre componentes que lo consuman
 * simultáneamente (p.ej. Sidebar y MainLayout) y para que las invalidaciones
 * existentes (ver BrandingSettingsCard) sigan refrescando todos los consumidores.
 */
export function useCompanyBranding() {
    return useQuery<CompanyBrandingData | null>({
        queryKey: ['company-branding'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('users')
                .select('company_id, role')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile?.company_id) return null

            const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .maybeSingle()

            return { company, userRole: profile.role as string | null }
        },
        staleTime: 5 * 60 * 1000,
    })
}
