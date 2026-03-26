import { TariffRate } from '@/shared/types';
import { Trash2 } from 'lucide-react';

interface ValidityPriceGroupProps {
    rates: TariffRate[];
    onUpdateRate: (id: string, field: keyof TariffRate, value: string | number | null) => void;
    onUpdateValidity: (validFrom: string | null, validTo: string | null) => void;
    onDelete: () => void;
    showUnitSelector?: boolean;
    unitOptions?: { value: string; label: string }[];
}

export function ValidityPriceGroup({
    rates,
    onUpdateRate,
    onUpdateValidity,
    onDelete,
    showUnitSelector = false,
    unitOptions = []
}: ValidityPriceGroupProps) {
    // Assume all rates in group share the same validity
    const validFrom = rates[0]?.valid_from || '';
    const validTo = rates[0]?.valid_to || '';

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
        <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            position: 'relative'
        }}>
            {/* Header: Dates & Delete */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={labelStyle}>Válido Desde</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                style={inputStyle}
                                value={validFrom}
                                onChange={(e) => onUpdateValidity(e.target.value || null, validTo || null)}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={labelStyle}>Válido Hasta</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                style={inputStyle}
                                value={validTo}
                                onChange={(e) => onUpdateValidity(validFrom || null, e.target.value || null)}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        padding: '0.25rem 0.75rem',
                        background: '#eff6ff',
                        color: '#2563eb',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}>
                        {rates.length} Precios
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm('¿Eliminar este periodo de vigencia?')) onDelete();
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            background: '#fee2e2', color: '#ef4444',
                            border: 'none', borderRadius: '0.375rem',
                            fontSize: '0.875rem', fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Rates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {rates.sort((a, b) => (a.period || '').localeCompare(b.period || '')).map((rate) => (
                    <div key={rate.id} style={{
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#111827' }}>{rate.period}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div>
                                <label style={labelStyle}>Precio</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 600 }}
                                    value={rate.price === null ? '' : rate.price}
                                    placeholder="0.000000"
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        onUpdateRate(rate.id, 'price', val);
                                    }}
                                />
                            </div>
                            {showUnitSelector && (
                                <div>
                                    <label style={labelStyle}>Unidad</label>
                                    <select
                                        style={inputStyle}
                                        value={rate.unit}
                                        onChange={(e) => onUpdateRate(rate.id, 'unit', e.target.value)}
                                    >
                                        {unitOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
