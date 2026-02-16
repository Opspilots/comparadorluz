import { useNavigate } from 'react-router-dom';
import { TariffVersion } from '@/shared/types';
import { format } from 'date-fns';
import { Calendar, ExternalLink } from 'lucide-react';
import { removeEmojis } from '@/shared/lib/utils';

interface GasTariffTableProps {
    tariffs: TariffVersion[];
}

export function GasTariffTable({ tariffs }: GasTariffTableProps) {
    const navigate = useNavigate();

    const getPrice = (tariff: TariffVersion, type: 'fixed' | 'variable') => {
        const components = tariff.tariff_components || [];
        const rates = tariff.tariff_rates || [];

        if (type === 'fixed') {
            const rate = rates.find(r => r.item_type === 'fixed_fee');
            if (rate && rate.price !== null) return rate.price.toFixed(2);
            const comp = components.find(c => c.component_type === 'fixed_fee');
            return comp?.fixed_price_eur_month ? comp.fixed_price_eur_month.toFixed(2) : '-';
        } else {
            const rate = rates.find(r => r.item_type === 'energy');
            if (rate && rate.price !== null) return rate.price.toFixed(6); // Gas needs more precision
            const comp = components.find(c => c.component_type === 'energy_price');
            return comp?.price_eur_kwh ? comp.price_eur_kwh.toFixed(6) : '-';
        }
    };

    const statusStyle = (isActive: boolean) => isActive
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#fcf7f4', borderBottom: '1px solid #fed7aa' }}> {/* Gas-themed header */}
                <tr>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Tarifa</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Tipo</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Término Fijo (€/mes)</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Término Variable (€/kWh)</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Validez</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>Estado</th>
                    <th style={{ padding: '1rem' }}></th>
                </tr>
            </thead>
            <tbody>
                {tariffs.map((tariff) => (
                    <tr
                        key={tariff.id}
                        onClick={() => navigate(`/admin/tariffs/${tariff.id}`)}
                        style={{
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            borderBottom: '1px solid #fff7ed' // Warmer border for gas
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff7ed')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{removeEmojis(tariff.tariff_name)}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{removeEmojis(tariff.supplier_name)}</div>
                            </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <span style={{
                                background: '#fff7ed', color: '#c2410c', fontSize: '0.7rem', fontWeight: 600,
                                padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase',
                                display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content'
                            }}>
                                {tariff.tariff_type}
                            </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                                {getPrice(tariff, 'fixed')} €
                            </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                                {getPrice(tariff, 'variable')} €
                            </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                                <Calendar size={14} />
                                {format(new Date(tariff.valid_from), 'dd/MM/yyyy')}
                            </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.6rem',
                                borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                                ...statusStyle(tariff.is_active)
                            }}>
                                {tariff.is_active ? 'Activa' : 'Inactiva'}
                            </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ea580c' }}>
                                <ExternalLink size={14} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
