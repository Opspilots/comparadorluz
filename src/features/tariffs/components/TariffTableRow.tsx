import { format } from 'date-fns';
import { Calendar, ExternalLink } from 'lucide-react';
import { TariffVersion } from '@/shared/types';
import { useNavigate } from 'react-router-dom';

interface TariffTableRowProps {
    tariff: TariffVersion;
}

export function TariffTableRow({ tariff }: TariffTableRowProps) {
    const navigate = useNavigate();

    // Group components and rates
    const components = tariff.tariff_components || [];
    const rates = tariff.tariff_rates || [];

    const isGas = tariff.tariff_type.startsWith('RL');

    // Get energy prices P1, P2, P3
    const getEnergyPrice = (period: string) => {
        // Try tariff_rates first (preferred)
        const rate = rates.find(r => r.item_type === 'energy' && r.period === period);
        if (rate && rate.price !== null) return rate.price.toFixed(4); // Increased precision for Gas/Elec details

        // Fallback to tariff_components
        const comp = components.find(c => c.component_type === 'energy_price' && c.period === period);
        return comp?.price_eur_kwh ? comp.price_eur_kwh.toFixed(4) : '-';
    };

    const statusStyle = tariff.is_active
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    const typeStyle = {
        background: '#f1f5f9',
        color: '#475569',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        textTransform: 'uppercase' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        width: 'fit-content'
    };

    return (
        <tr
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
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{tariff.tariff_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tariff.supplier_name}</div>
                </div>
            </td>

            <td style={{ padding: '1rem' }}>
                <span style={typeStyle}>
                    {tariff.tariff_type}
                </span>
            </td>

            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{isGas ? 'Var:' : 'P1:'}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getEnergyPrice('P1')}</span>
                    </div>
                    {!isGas && (
                        <>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>P2:</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getEnergyPrice('P2')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>P3:</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getEnergyPrice('P3')}</span>
                            </div>
                        </>
                    )}
                </div>
            </td>

            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <Calendar size={14} />
                    {format(new Date(tariff.valid_from), 'dd/MM/yyyy')}
                </div>
            </td>

            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        ...statusStyle
                    }}>
                        {tariff.is_active ? 'Activa' : 'Inactiva'}
                    </div>
                    {tariff.is_automated && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.1rem 0.4rem',
                            fontSize: '0.65rem',
                            color: '#2563eb',
                            fontWeight: 700,
                            background: '#eff6ff',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                        }}>
                            Auto: {tariff.automation_source}
                        </div>
                    )}
                </div>
            </td>

            <td style={{ padding: '1rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                        title="Ver Detalle"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
