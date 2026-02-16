import { useNavigate } from 'react-router-dom';
import { TariffVersion } from '@/shared/types';
import { format } from 'date-fns';
import { Calendar, ExternalLink } from 'lucide-react';
import { removeEmojis } from '@/shared/lib/utils';

interface ElectricityTariffTableProps {
    tariffs: TariffVersion[];
}

export function ElectricityTariffTable({ tariffs }: ElectricityTariffTableProps) {
    const navigate = useNavigate();

    const getEnergyPrice = (tariff: TariffVersion, period: string) => {
        const rates = tariff.tariff_rates || [];
        const components = tariff.tariff_components || [];

        const rate = rates.find(r => r.item_type === 'energy' && r.period === period);
        if (rate && rate.price !== null) return rate.price.toFixed(4);

        const comp = components.find(c => c.component_type === 'energy_price' && c.period === period);
        return comp?.price_eur_kwh ? comp.price_eur_kwh.toFixed(4) : '-';
    };

    const statusStyle = (isActive: boolean) => isActive
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tarifa</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Energía (P1/P2/P3)</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Potencia</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Validez</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
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
                            borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
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
                                background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 600,
                                padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase',
                                display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content'
                            }}>
                                {tariff.tariff_type}
                            </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P1</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getEnergyPrice(tariff, 'P1')}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P2</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getEnergyPrice(tariff, 'P2')}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P3</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getEnergyPrice(tariff, 'P3')}</span>
                                </div>
                            </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>-</span>
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
                            <button className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                                <ExternalLink size={14} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
