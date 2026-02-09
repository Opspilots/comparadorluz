
import { format } from 'date-fns';
import { Calendar, CheckCircle, Zap } from 'lucide-react';
import { TariffVersion, TariffComponent } from '@/shared/types';
import { useNavigate } from 'react-router-dom';

interface TariffVersionCardProps {
    tariff: TariffVersion;
}

export function TariffVersionCard({ tariff }: TariffVersionCardProps) {
    const navigate = useNavigate();

    // Group components by period for display
    const components = tariff.tariff_components || [];

    const energyPrices = components
        .filter(c => c.component_type === 'energy_price')
        .sort((a, b) => (a.period || '').localeCompare(b.period || ''));

    const powerPrices = components
        .filter(c => c.component_type === 'power_price')
        .sort((a, b) => (a.period || '').localeCompare(b.period || ''));

    return (
        <div
            onClick={() => navigate(`/admin/tariffs/${tariff.batch_id}`)}
            className="card group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg h-full flex flex-col hover:border-blue-400"
            style={{
                borderLeft: '4px solid #0ea5e9',
                padding: '1.5rem',
                background: 'white'
            }}
        >
            {/* Header: Supplier & Name */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">
                            {tariff.tariff_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {tariff.supplier_name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Type & Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 uppercase tracking-wide">
                    {tariff.tariff_type}
                </span>
                {tariff.is_active && (
                    <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle size={12} className="mr-1" />
                        Activa
                    </span>
                )}
            </div>

            {/* Pricing Section (Phases) */}
            <div className="mb-4 space-y-3">
                {/* Energy Prices */}
                <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Energía (€/kWh)</div>
                    <div className="grid grid-cols-3 gap-2">
                        {energyPrices.map((price) => (
                            <div key={price.id} className="text-center bg-slate-50 rounded p-1.5">
                                <div className="text-[10px] text-gray-400 font-medium">{price.period}</div>
                                <div className="text-sm font-semibold text-gray-700">
                                    {price.price_eur_kwh?.toFixed(6)}
                                </div>
                            </div>
                        ))}
                        {energyPrices.length === 0 && (
                            <div className="col-span-3 text-xs text-gray-400 italic text-center">Sin precios de energía</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer: Validity */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center text-xs text-gray-500">
                <Calendar size={14} className="mr-2 text-gray-400" />
                <span>
                    {format(new Date(tariff.valid_from), 'dd/MM/yyyy')}
                </span>
                {tariff.valid_to && (
                    <span className="ml-1">
                        - {format(new Date(tariff.valid_to), 'dd/MM/yyyy')}
                    </span>
                )}
            </div>
        </div>
    );
}
