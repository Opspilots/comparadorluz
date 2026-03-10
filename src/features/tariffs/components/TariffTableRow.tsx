import { format } from 'date-fns';
import { Calendar, ExternalLink, History } from 'lucide-react';
import { TariffVersion } from '@/shared/types';
import { useNavigate } from 'react-router-dom';
import { findActiveRate, hasRateHistory } from '../lib/tariffUtils';

interface TariffTableRowProps {
    tariff: TariffVersion;
}

export const TariffTableRow = ({ tariff }: TariffTableRowProps) => {
    const navigate = useNavigate();
    const rates = tariff.tariff_rates || [];
    const components = tariff.tariff_components || [];

    // Get energy prices P1, P2, P3
    const getEnergyPrice = (period: string) => {
        const activeRate = findActiveRate(rates, 'energy', period, undefined, tariff.contract_duration);
        if (activeRate && activeRate.price !== null) return activeRate.price.toFixed(4);

        // Fallback to tariff_components (deprecated)
        const comp = components.find(c => c.component_type === 'energy_price' && c.period === period);
        return comp?.price_eur_kwh ? comp.price_eur_kwh.toFixed(4) : '-';
    };

    const hasHistory = hasRateHistory(rates, 'energy', 'P1', tariff.contract_duration) ||
        hasRateHistory(rates, 'energy', 'P2', tariff.contract_duration) ||
        hasRateHistory(rates, 'energy', 'P3', tariff.contract_duration) ||
        hasRateHistory(rates, 'fixed_fee', undefined, tariff.contract_duration);

    const statusStyle = tariff.is_active
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <tr
            key={tariff.id}
            onClick={() => navigate(`/admin/tariffs/${tariff.id}`)}
            style={{
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                borderBottom: '1px solid #f1f5f9'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tariff.tariff_name}
                        {hasHistory && (
                            <span title="Tiene historial de precios" style={{ color: '#6366f1', background: '#eef2ff', padding: '0.1rem 0.3rem', borderRadius: '4px', display: 'flex' }}>
                                <History size={12} />
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tariff.supplier_name}</div>
                </div>
            </td>
            <td style={{ padding: '1rem' }}>
                <span style={{
                    background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600,
                    padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase'
                }}>
                    {tariff.tariff_type}
                </span>
            </td>
            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P1</span>
                        <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{getEnergyPrice('P1')}</span>
                    </div>
                    {(tariff.tariff_type?.includes('2.0') || tariff.tariff_type?.includes('3.0')) && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P2</span>
                                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{getEnergyPrice('P2')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P3</span>
                                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{getEnergyPrice('P3')}</span>
                            </div>
                        </>
                    )}
                </div>
            </td>
            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <Calendar size={14} />
                    {tariff.valid_from ? format(new Date(tariff.valid_from), 'dd/MM/yyyy') : 'Siempre'}
                </div>
            </td>
            <td style={{ padding: '1rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.6rem',
                    borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                    ...statusStyle
                }}>
                    {tariff.is_active ? 'Activa' : 'Inactiva'}
                </div>
            </td>
            <td style={{ padding: '1rem', textAlign: 'right' }}>
                <button
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ExternalLink size={14} className="text-gray-400" />
                </button>
            </td>
        </tr>
    );
};
