import { useEffect, useState } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';

interface Step3AProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3AEnergyPrices({ data, structure, onChange }: Step3AProps) {
    const [localRates, setLocalRates] = useState<TariffRate[]>([]);

    useEffect(() => {
        if (!structure) return;

        // Initialize rates if not present
        const existingEnergyRates = data.rates.filter(r => r.item_type === 'energy');

        if (existingEnergyRates.length === 0) {
            const newRates: TariffRate[] = [];
            for (let i = 1; i <= structure.energy_periods; i++) {
                newRates.push({
                    id: crypto.randomUUID(),
                    tariff_version_id: '', // Set on save
                    item_type: 'energy',
                    period: `P${i}`,
                    price: null,
                    price_formula: '',
                    unit: 'EUR/kWh',
                    confidence_score: 1.0 // Default for manual
                });
            }
            setLocalRates(newRates);
            // Notify parent? Or wait for edits?
            // onChange([...data.rates.filter(r => r.item_type !== 'energy'), ...newRates]);
        } else {
            setLocalRates(existingEnergyRates);
        }
    }, [structure, data.rates]);

    const updateRate = (index: number, field: keyof TariffRate, value: any) => {
        const updated = [...localRates];
        updated[index] = { ...updated[index], [field]: value };
        setLocalRates(updated);

        // Update parent state
        const otherRates = data.rates.filter(r => r.item_type !== 'energy');
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

    const isGas = structure?.code?.startsWith('RL');
    const title = isGas ? 'Término Variable (Energía)' : 'Precios de Energía (Término Variable)';
    const itemLabel = isGas ? 'Variable' : 'Energía';
    const priceLabel = isGas ? 'Precio Variable (€/kWh)' : 'Precio Energía (€/kWh)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Validación de precios por periodo.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {localRates.map((rate, idx) => (
                    <div key={rate.period} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${isGas ? '#f97316' : '#3b82f6'}`, background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{rate.period}</h3>
                            <span style={{ fontSize: '0.75rem', background: isGas ? '#fff7ed' : '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', color: isGas ? '#c2410c' : '#374151' }}>{itemLabel}</span>
                        </div>

                        {data.metadata.is_indexed ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Fórmula Indexada</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="Ej: OMIE + 0.01"
                                        value={rate.price_formula || ''}
                                        onChange={(e) => updateRate(idx, 'price_formula', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Precio Simulado (€/kWh)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        style={inputStyle}
                                        value={rate.price || ''}
                                        onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label style={labelStyle}>{priceLabel}</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1rem' }}
                                    value={rate.price || ''}
                                    onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!isGas && (
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Precio Energía Reactiva</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px)', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Precio (€/kVArh)</label>
                            <input
                                type="number"
                                step="0.000001"
                                style={inputStyle}
                                placeholder="0.041554"
                                value={data.rates.find(r => r.item_type === 'reactive')?.price || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const otherRates = data.rates.filter(r => r.item_type !== 'reactive');
                                    const reactiveRate: TariffRate = {
                                        id: data.rates.find(r => r.item_type === 'reactive')?.id || crypto.randomUUID(),
                                        tariff_version_id: '',
                                        item_type: 'reactive',
                                        price: isNaN(val) ? null : val,
                                        unit: 'EUR/kVArh',
                                        confidence_score: 1.0
                                    };
                                    onChange([...otherRates, reactiveRate]);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
