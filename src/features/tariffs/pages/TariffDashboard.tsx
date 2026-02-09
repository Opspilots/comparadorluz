
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
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
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
        queryKey: ['tariff-versions', companyId, typeFilter, statusFilter],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('tariff_versions')
                .select('*, tariff_components(*)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            // Status Filter
            if (statusFilter === 'active') {
                query = query.eq('is_active', true);
            } else if (statusFilter === 'inactive') {
                query = query.eq('is_active', false);
            }
            // 'all' doesn't need a filter on is_active

            // Type Filter
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
            <div className="mb-6 flex flex-col space-y-4">

                {/* Top Row: Filters and Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Key Filters Group */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">

                        {/* Status Filter */}
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setStatusFilter('active')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'active'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Activas
                            </button>
                            <button
                                onClick={() => setStatusFilter('inactive')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'inactive'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Inactivas
                            </button>
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'all'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Todas
                            </button>
                        </div>

                        {/* Type Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar border-l pl-4 border-slate-200">
                            <Button
                                variant={typeFilter === 'all' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTypeFilter('all')}
                                className="rounded-full px-4 h-8"
                            >
                                Todas
                            </Button>
                            {tariffTypes.map((type) => (
                                <Button
                                    key={type}
                                    variant={typeFilter === type ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setTypeFilter(type)}
                                    className="rounded-full px-4 h-8"
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/admin/tariffs/new'}
                        >
                            + Crear Manualmente
                        </Button>
                        <TariffUploadDialog companyId={companyId} />
                    </div>
                </div>
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
                    <h3 className="text-lg font-medium text-slate-900">No hay tarifas {statusFilter !== 'all' ? (statusFilter === 'active' ? 'activas' : 'inactivas') : ''}</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">
                        No se encontraron tarifas {typeFilter !== 'all' ? `del tipo ${typeFilter}` : ''} con los filtros seleccionados.
                    </p>
                    <div className="flex gap-2 justify-center">
                        {statusFilter !== 'all' && (
                            <Button variant="outline" onClick={() => setStatusFilter('all')}>
                                Ver todas los estados
                            </Button>
                        )}
                        {typeFilter !== 'all' && (
                            <Button variant="outline" onClick={() => setTypeFilter('all')}>
                                Ver todos los tipos
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
