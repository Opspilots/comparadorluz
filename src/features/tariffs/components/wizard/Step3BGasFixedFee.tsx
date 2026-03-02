import { useEffect, useRef } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';

interface Step3BGasProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3BGasFixedFee({ data, structure, onChange }: Step3BGasProps) {
    const initialized = useRef(false);

    // One-time initialization: add an empty fixed_fee if none exists
    useEffect(() => {
        if (!structure || initialized.current) return;
        const existingFixedFee = data.rates.find(r => r.item_type === 'fixed_fee');
        if (!existingFixedFee) {
            const newRate: TariffRate = {
                id: crypto.randomUUID(),
                tariff_version_id: '',
                item_type: 'fixed_fee',
                period: 'P1',
                price: null,
                unit: 'EUR/month',
                confidence_score: 1.0,
            };
            onChange([...data.rates, newRate]);
        }
        initialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structure?.id]);

    const fixedFeeRates = data.rates.filter(r => r.item_type === 'fixed_fee');

    const updateRate = (rateId: string, price: number | null) => {
        const newRates = data.rates.map(r =>
            r.id === rateId ? { ...r, price, unit: 'EUR/month' } : r
        );
        onChange(newRates);
    };

    if (!structure) return <div>Selecciona una estructura en el paso 1.</div>;

    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.75rem', fontWeight: 500,
        color: '#374151', marginBottom: '0.25rem',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.5rem', borderRadius: '0.375rem',
        border: '1px solid #d1d5db', fontSize: '0.875rem',
        outline: 'none', transition: 'border-color 0.15s ease-in-out',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Término Fijo Gas</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    Cuota fija mensual del suministro de gas natural.
                </p>
            </div>

            {fixedFeeRates.map((rate) => (
                <div
                    key={rate.id}
                    className="card"
                    style={{
                        padding: '1rem', borderLeft: '4px solid #f59e0b', background: 'white',
                        borderRadius: '0.5rem', border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                            Cuota Fija
                            {rate.contract_duration ? ` — ${rate.contract_duration} meses` : ''}
                        </h3>
                        <span style={{
                            fontSize: '0.75rem', background: '#fef3c7', padding: '0.125rem 0.5rem',
                            borderRadius: '0.25rem', color: '#92400e',
                        }}>
                            {structure.name}
                        </span>
                    </div>

                    {rate.price != null && rate.price > 0 && (
                        <div style={{
                            fontSize: '0.75rem', color: '#059669', background: '#ecfdf5',
                            border: '1px solid #a7f3d0', borderRadius: '0.25rem',
                            padding: '0.25rem 0.5rem', marginBottom: '0.5rem', display: 'inline-block',
                        }}>
                            Detectado por OCR: {rate.price} €/mes
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Precio (€/mes)</label>
                            <input
                                type="number"
                                step="0.01"
                                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1rem' }}
                                value={rate.price ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                    updateRate(rate.id, val);
                                }}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Unidad</label>
                            <select style={inputStyle} value="EUR/month" disabled>
                                <option value="EUR/month">€/mes</option>
                            </select>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
