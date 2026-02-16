import { useEffect, useState } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';

interface Step3BGasProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3BGasFixedFee({ data, structure, onChange }: Step3BGasProps) {
    const [localRate, setLocalRate] = useState<TariffRate | null>(null);

    useEffect(() => {
        if (!structure) return;

        // Find existing fixed fee rate (Gas typically has 1 fixed fee)
        const existingFixedFee = data.rates.find(r => r.item_type === 'fixed_fee');

        if (!existingFixedFee) {
            const newRate: TariffRate = {
                id: crypto.randomUUID(),
                tariff_version_id: '',
                item_type: 'fixed_fee',
                period: 'P1', // Default period
                price: null,
                unit: 'EUR/month', // Default unit for Gas Fixed Fee
                confidence_score: 1.0
            };
            setLocalRate(newRate);
        } else {
            setLocalRate(existingFixedFee);
        }
    }, [structure, data.rates]);

    const updateRate = (field: keyof TariffRate, value: string | number | null) => {
        if (!localRate) return;

        const updated = { ...localRate, [field]: value };
        // Ensure unit is correct
        if (field === 'price' && typeof value === 'number') {
            updated.price = value;
        }

        setLocalRate(updated);

        // Update parent state
        // Remove existing fixed_fee rates and add the updated one
        const otherRates = data.rates.filter(r => r.item_type !== 'fixed_fee');
        onChange([...otherRates, updated]);
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Término Fijo Gas</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Define el precio del término fijo de gas.</p>
            </div>

            {localRate && (
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Cuota Fija</h3>
                        <span style={{ fontSize: '0.75rem', background: '#fef3c7', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', color: '#92400e' }}>{structure.name}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Precio (€/mes)</label>
                            <input
                                type="number"
                                step="0.01"
                                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1rem' }}
                                value={localRate.price || ''}
                                onChange={(e) => updateRate('price', parseFloat(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Unidad</label>
                            <select
                                style={inputStyle}
                                value={localRate.unit}
                                disabled // Fixed to EUR/month for Gas logic simplicity
                            >
                                <option value="EUR/month">€/mes</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
