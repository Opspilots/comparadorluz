import { useEffect, useRef } from 'react';
import { TariffRate, TariffWizardState } from '@/shared/types';
import { Plus, Trash2 } from 'lucide-react';

interface Step5Props {
    data: TariffWizardState;
    onChange: (rates: TariffRate[]) => void;
    onMetadataChange?: <K extends keyof TariffWizardState['metadata']>(key: K, value: TariffWizardState['metadata'][K]) => void;
}

export function Step5FeesAndTaxes({ data, onChange, onMetadataChange }: Step5Props) {
    const feesAndTaxes = data.rates.filter(r => ['fixed_fee', 'tax', 'discount'].includes(r.item_type));
    const initialized = useRef(false);

    // Add default 21% IVA on first mount if no tax exists
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        const hasTax = data.rates.some(r => r.item_type === 'tax');
        if (!hasTax) {
            const ivaRate: TariffRate = {
                id: crypto.randomUUID(),
                tariff_version_id: '',
                item_type: 'tax',
                price: 21,
                unit: '%',
                period: undefined,
            };
            onChange([...data.rates, ivaRate]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addRate = (type: 'fixed_fee' | 'tax' | 'discount') => {
        const newRate: TariffRate = {
            id: crypto.randomUUID(),
            tariff_version_id: '',
            item_type: type,
            price: 0,
            unit: type === 'fixed_fee' ? 'EUR/month' : '%',
        };
        onChange([...data.rates, newRate]);
    };

    const removeRate = (id: string) => {
        onChange(data.rates.filter(r => r.id !== id));
    };

    const updateRate = <K extends keyof TariffRate>(id: string, field: K, value: TariffRate[K]) => {
        const updatedRates = data.rates.map(r => r.id === id ? { ...r, [field]: value } : r);
        onChange(updatedRates);
    };

    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' };
    const inputStyle = {
        width: '100%',
        padding: '0.375rem 0.5rem',
        borderRadius: '0.375rem',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        outline: 'none'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Comisión, Cargos Extra e Impuestos</h2>

            {/* Commission Section */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.75rem' }}>
                    Comisión de la Tarifa
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Valor</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            style={inputStyle}
                            value={data.metadata.commission_value === 0 ? '' : data.metadata.commission_value}
                            onChange={(e) => onMetadataChange?.('commission_value', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            placeholder="Ej: 10"
                        />
                    </div>
                    <div style={{ width: '10rem' }}>
                        <label style={labelStyle}>Tipo</label>
                        <select
                            style={inputStyle}
                            value={data.metadata.commission_type}
                            onChange={(e) => onMetadataChange?.('commission_type', e.target.value as 'percentage' | 'fixed')}
                        >
                            <option value="percentage">% del coste anual</option>
                            <option value="fixed">€/año fijos</option>
                        </select>
                    </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
                    {data.metadata.commission_type === 'percentage'
                        ? 'Porcentaje sobre el coste anual calculado del cliente.'
                        : 'Importe fijo anual en euros por contrato.'}
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {feesAndTaxes.map((rate) => (
                    <div key={rate.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Tipo</label>
                            <select
                                style={inputStyle}
                                value={rate.item_type}
                                onChange={(e) => updateRate(rate.id, 'item_type', e.target.value as TariffRate['item_type'])}
                            >
                                <option value="fixed_fee">Cuota Fija</option>
                                <option value="tax">Impuesto</option>
                                <option value="discount">Descuento</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Valor</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={rate.price || ''}
                                onChange={(e) => updateRate(rate.id, 'price', parseFloat(e.target.value))}
                            />
                        </div>
                        <div style={{ width: '6rem' }}>
                            <label style={labelStyle}>Unidad</label>
                            <select
                                style={inputStyle}
                                value={rate.unit}
                                onChange={(e) => updateRate(rate.id, 'unit', e.target.value)}
                            >
                                <option value="EUR/month">€/mes</option>
                                <option value="EUR/day">€/día</option>
                                <option value="%">%</option>
                            </select>
                        </div>
                        <button
                            onClick={() => removeRate(rate.id)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {feesAndTaxes.length === 0 && (
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>No hay cargos extra configurados.</p>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => addRate('fixed_fee')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Añadir Cuota
                </button>
                <button onClick={() => addRate('tax')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Añadir Impuesto
                </button>
            </div>
        </div>
    );
}
