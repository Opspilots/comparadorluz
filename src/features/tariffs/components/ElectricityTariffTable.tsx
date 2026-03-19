import { useNavigate } from 'react-router-dom';
import { TariffVersion } from '@/shared/types';
import { format } from 'date-fns';
import { Calendar, ExternalLink, History } from 'lucide-react';
import { removeEmojis } from '@/shared/lib/utils';
import { findActiveRate, hasRateHistory, toPowerMonthly } from '../lib/tariffUtils';

interface ElectricityTariffTableProps {
    tariffs: TariffVersion[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    viewDate?: string;
}

export function ElectricityTariffTable({ tariffs, selectedIds, onSelectionChange, viewDate }: ElectricityTariffTableProps) {
    const navigate = useNavigate();

    const statusStyle = (isActive: boolean) => isActive
        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
        : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
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
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Energía (€/kWh)</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Potencia (€/kW/mes)</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Validez</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                        <th style={{ padding: '1rem' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {tariffs.map((tariff) => {
                        const rates = tariff.tariff_rates || [];

                        const energyPeriods = Array.from(new Set(rates.filter(r => r.item_type === 'energy').map(r => r.period).filter(Boolean))) as string[];
                        const powerPeriods = Array.from(new Set(rates.filter(r => r.item_type === 'power').map(r => r.period).filter(Boolean))) as string[];

                        const displayValidFrom = tariff.valid_from;

                        return (
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
                                        padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase',
                                        display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content'
                                    }}>
                                        {tariff.tariff_type}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {energyPeriods.length > 0 ? energyPeriods.map(p => {
                                            const active = findActiveRate(rates, 'energy', p, viewDate, tariff.contract_duration);
                                            const history = hasRateHistory(rates, 'energy', p, tariff.contract_duration);
                                            return (
                                                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p}</span>
                                                        {history && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/admin/tariffs/${tariff.id}`);
                                                                }}
                                                                title="Ver historial completo"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                                            >
                                                                <History size={10} style={{ color: '#6366f1' }} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        {active?.price != null ? active.price.toFixed(4) : (active?.price_formula ? 'Fórmula' : '-')}
                                                    </span>
                                                </div>
                                            );
                                        }) : (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {powerPeriods.length > 0 ? powerPeriods.map(p => {
                                            const active = findActiveRate(rates, 'power', p, viewDate, tariff.contract_duration);
                                            const history = hasRateHistory(rates, 'power', p, tariff.contract_duration);
                                            return (
                                                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p}</span>
                                                        {history && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/admin/tariffs/${tariff.id}`);
                                                                }}
                                                                title="Ver historial completo"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                                            >
                                                                <History size={10} style={{ color: '#6366f1' }} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                                        {active?.price != null ? toPowerMonthly(active.price, active.unit).toFixed(4) : (active?.price_formula ? 'Fórmula' : '-')}
                                                    </span>
                                                </div>
                                            );
                                        }) : (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                                        <Calendar size={14} />
                                        {displayValidFrom ? format(new Date(displayValidFrom), 'dd/MM/yyyy') : '-'}
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
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
}
