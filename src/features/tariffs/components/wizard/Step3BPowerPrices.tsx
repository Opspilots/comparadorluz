import { useEffect, useState } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';

interface Step3BProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3BPowerPrices({ data, structure, onChange }: Step3BProps) {
    const [localRates, setLocalRates] = useState<TariffRate[]>([]);

    useEffect(() => {
        if (!structure) return;

        const existingPowerRates = data.rates.filter(r => r.item_type === 'power');

        if (existingPowerRates.length === 0) {
            const newRates: TariffRate[] = [];
            for (let i = 1; i <= structure.power_periods; i++) {
                newRates.push({
                    id: crypto.randomUUID(),
                    tariff_version_id: '',
                    item_type: 'power',
                    period: `P${i}`,
                    price: null,
                    unit: 'EUR/kW/year', // Default unit
                    confidence_score: 1.0
                });
            }
            setLocalRates(newRates);
        } else {
            setLocalRates(existingPowerRates);
        }
    }, [structure, data.rates]);

    const updateRate = (index: number, field: keyof TariffRate, value: string | number | null) => {
        const updated = [...localRates];
        // Ensure type safety when updating the rate
        if (field === 'price' && typeof value === 'number') {
            updated[index] = { ...updated[index], price: value };
        } else if (field === 'unit' && typeof value === 'string') {
            updated[index] = { ...updated[index], unit: value };
        } else {
            // Fallback for other fields if necessary, though currently only price and unit are updated
            (updated[index] as any)[field] = value;
        }

        setLocalRates(updated);

        const otherRates = data.rates.filter(r => r.item_type !== 'power');
        onChange([...otherRates, ...updated]);
    };

    if (!structure) return <div>Selecciona una estructura en el paso 1.</div>;

    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' };
    const inputStyle = {
        width: '100%',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s ease-in-out'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Precios de Potencia (Término Fijo)</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Validación de precios por potencia contratada.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {localRates.map((rate, idx) => (
                    <div key={rate.period} className="card" style={{ padding: '1rem', borderLeft: '4px solid #22c55e', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{rate.period}</h3>
                            <span style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', color: '#374151' }}>Potencia</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <label style={labelStyle}>Precio</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1rem' }}
                                    value={rate.price || ''}
                                    onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Unidad</label>
                                <select
                                    style={inputStyle}
                                    value={rate.unit}
                                    onChange={(e) => updateRate(idx, 'unit', e.target.value)}
                                >
                                    <option value="EUR/kW/year">€/kW/año</option>
                                    <option value="EUR/kW/day">€/kW/día</option>
                                    <option value="EUR/kW/month">€/kW/mes</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #dcfce7', marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>Excesos de Potencia / Máximo Demandado</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px)', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Precio Exceso (€/kW/día)</label>
                        <input
                            type="number"
                            step="0.000001"
                            style={inputStyle}
                            placeholder="Ej: 0.054321"
                            value={data.rates.find(r => r.item_type === 'excess_power')?.price || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const otherRates = data.rates.filter(r => r.item_type !== 'excess_power');
                                const excessRate: TariffRate = {
                                    id: data.rates.find(r => r.item_type === 'excess_power')?.id || crypto.randomUUID(),
                                    tariff_version_id: '',
                                    item_type: 'excess_power',
                                    price: isNaN(val) ? null : val,
                                    unit: 'EUR/kW/day',
                                    confidence_score: 1.0
                                };
                                onChange([...otherRates, excessRate]);
                            }}
                        />
                    </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.5rem', opacity: 0.8 }}>
                    Este precio se aplica a los excesos registrados por el maxímetro o telemedida.
                </p>
            </div>
        </div>
    );
}
