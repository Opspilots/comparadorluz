import { useNavigate } from 'react-router-dom';
import { TariffVersion } from '@/shared/types';
import { format } from 'date-fns';
import { Calendar, ExternalLink, History } from 'lucide-react';
import { removeEmojis } from '@/shared/lib/utils';
import { findActiveRate, hasRateHistory } from '../lib/tariffUtils';

interface GasTariffTableProps {
    tariffs: TariffVersion[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    viewDate?: string;
}

export function GasTariffTable({ tariffs, selectedIds, onSelectionChange, viewDate }: GasTariffTableProps) {
    const navigate = useNavigate();

    const getFormattedPrice = (tariff: TariffVersion, type: 'fixed' | 'variable') => {
        const rates = tariff.tariff_rates || [];
        const itemType = type === 'fixed' ? 'fixed_fee' : 'energy';
        // For gas tariffs, we always check P1 if no specific period is found
        const active = findActiveRate(rates, itemType, 'P1', viewDate, tariff.contract_duration) ||
            findActiveRate(rates, itemType, undefined, viewDate, tariff.contract_duration);

        if (active && active.price != null) {
            return type === 'fixed' ? `${active.price.toFixed(2)} €` : `${active.price.toFixed(6)} €`;
        }
        if (active && active.price_formula) {
            return 'Fórmula';
        }

        // Fallback to components (deprecated)
        const components = tariff.tariff_components || [];
        const compType = type === 'fixed' ? 'fixed_fee' : 'energy_price';
        const comp = components.find(c => c.component_type === compType);

        if (type === 'fixed') {
            return comp?.fixed_price_eur_month != null ? `${comp.fixed_price_eur_month.toFixed(2)} €` : '-';
        } else {
            return comp?.price_eur_kwh != null ? `${comp.price_eur_kwh.toFixed(6)} €` : '-';
        }
    };

    const statusStyle = (isActive: boolean) => isActive
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                        <th style={{ padding: '1rem', width: '40px' }}>
                            <input
                                type="checkbox"
                                checked={tariffs.length > 0 && selectedIds.length === tariffs.length}
                                onChange={(e) => {
                                    if (e.target.checked) onSelectionChange(tariffs.map(t => t.id!));
                                    else onSelectionChange([]);
                                }}
                                style={{ cursor: 'pointer' }}
                            />
                        </th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tarifa</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Comercializadora</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Término Fijo (€/mes)</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Término Variable (€/kWh)</th>
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
                                borderBottom: '1px solid #f1f5f9',
                                background: selectedIds.includes(tariff.id) ? '#f0f9ff' : 'transparent'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(tariff.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) onSelectionChange([...selectedIds, tariff.id]);
                                        else onSelectionChange(selectedIds.filter(id => id !== tariff.id));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{removeEmojis(tariff.tariff_name)}</div>
                                </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{removeEmojis(tariff.supplier_name)}</div>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                                        {getFormattedPrice(tariff, 'fixed')}
                                    </span>
                                    {hasRateHistory(tariff.tariff_rates || [], 'fixed_fee', undefined, tariff.contract_duration) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/tariffs/${tariff.id}`);
                                            }}
                                            title="Ver historial completo"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                        >
                                            <History size={12} style={{ color: '#6366f1' }} />
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                                        {getFormattedPrice(tariff, 'variable')}
                                    </span>
                                    {hasRateHistory(tariff.tariff_rates || [], 'energy', undefined, tariff.contract_duration) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/admin/tariffs/${tariff.id}`);
                                            }}
                                            title="Ver historial completo"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                        >
                                            <History size={12} style={{ color: '#f97316' }} />
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                                    <Calendar size={14} />
                                    {tariff.valid_from ? format(new Date(tariff.valid_from), 'dd/MM/yyyy') : '-'}
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
        </div>
    );
}
