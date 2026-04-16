import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { getUserCompanyId } from './messaging-service';

interface CustomerSearchResult {
    id: string;
    name: string;
    cif?: string;
}

/**
 * Reusable hook for searching customers by name or CIF.
 * Used by both NewMessageDialog and MessagingLayout sidebar search.
 */
export function useCustomerSearch(searchTerm: string, limit: number = 10) {
    return useQuery<CustomerSearchResult[]>({
        queryKey: ['customers-search', searchTerm, limit],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 2) return [];

            const companyId = await getUserCompanyId();

            const safeTerm = searchTerm.replace(/[(),]/g, '').trim()
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, cif')
                .or(`name.ilike.*${safeTerm}*,cif.ilike.*${safeTerm}*`)
                .eq('company_id', companyId)
                .order('name')
                .limit(limit);

            if (error) throw error;
            return data ?? [];
        },
        enabled: searchTerm.length >= 2,
    });
}
