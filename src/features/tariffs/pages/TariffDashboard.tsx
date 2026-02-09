
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffVersion } from '@/shared/types';
import { TariffUploadDialog } from '../components/TariffUploadDialog';
import { TariffVersionCard } from '../components/TariffVersionCard';
import { Loader2, ZapOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function TariffDashboard() {
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [companyId, setCompanyId] = useState<string | null>(null);

    // Get current user's company
    useQuery({
        queryKey: ['current-user-company'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (userData?.company_id) {
                setCompanyId(userData.company_id);
            }
            return userData;
        }
    });

    const { data: tariffs, isLoading } = useQuery({
        queryKey: ['tariff-versions', companyId, typeFilter],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('tariff_versions')
                .select('*, tariff_components(*)')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (typeFilter !== 'all') {
                query = query.eq('tariff_type', typeFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as TariffVersion[];
        },
        enabled: !!companyId
    });

    // Unique tariff types for filter
    const tariffTypes = ['2.0TD', '3.0TD', '6.1TD', '6.2TD'];

    if (!companyId) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Actions Bar - Removed Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    <Button
                        variant={typeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTypeFilter('all')}
                        className="rounded-full px-4"
                    >
                        Todas
                    </Button>
                    {tariffTypes.map((type) => (
                        <Button
                            key={type}
                            variant={typeFilter === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTypeFilter(type)}
                            className="rounded-full px-4"
                        >
                            {type}
                        </Button>
                    ))}
                </div>

                <TariffUploadDialog companyId={companyId} />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : tariffs && tariffs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tariffs.map((tariff) => (
                        <TariffVersionCard key={tariff.id} tariff={tariff} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed">
                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <ZapOff className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No hay tarifas activas</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">
                        No se encontraron tarifas {typeFilter !== 'all' ? `del tipo ${typeFilter}` : ''}.
                    </p>
                    {typeFilter !== 'all' && (
                        <Button variant="outline" onClick={() => setTypeFilter('all')}>
                            Ver todas
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
