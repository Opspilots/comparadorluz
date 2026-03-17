import { useEffect } from 'react';
import { TariffStructure } from '@/types/tariff';

interface Step1Props {
    data: {
        supplier_id: string;
        tariff_structure_id: string;
        name: string;
        code: string;
        is_indexed: boolean;
        valid_from: string;
        contract_duration: number | null;
        commission_type: 'percentage' | 'fixed';
        commission_value: number;
    };
    mode?: 'create' | 'edit';
    onChange: <K extends keyof Step1Props['data']>(key: K, value: Step1Props['data'][K]) => void;
    suppliers?: import('@/types/tariff').Supplier[]; // Now passed from parent
    structures?: TariffStructure[]; // Now passed from parent
}

export default function Step1Metadata({ data, mode = 'create', onChange, suppliers = [], structures = [] }: Step1Props) {
    // Removed internal state for structures/suppliers as they come from props now

    useEffect(() => {
        // Logic to fetch is moved to parent to allow auto-mapping
    }, []);

    const isEdit = mode === 'edit';

    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' };
    const inputStyle = {
        width: '100%',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s ease-in-out',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };
    const disabledStyle = { background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Configuración Básica</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                    <label style={labelStyle}>Comercializadora</label>
                    <select
                        style={{ ...inputStyle, ...(isEdit ? disabledStyle : {}) }}
                        value={data.supplier_id || ''}
                        onChange={(e) => onChange('supplier_id', e.target.value)}
                        disabled={isEdit}
                    >
                        <option value="">Seleccionar...</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Nombre de la Tarifa</label>
                    <input
                        type="text"
                        style={inputStyle}
                        value={data.name || ''}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="Ej: Plan Estable 24h"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Estructura Tarifaria</label>
                    <select
                        style={{ ...inputStyle, ...(isEdit ? disabledStyle : {}) }}
                        value={data.tariff_structure_id || ''}
                        onChange={(e) => onChange('tariff_structure_id', e.target.value)}
                        disabled={isEdit}
                    >
                        <option value="">Seleccionar Estructura...</option>
                        {structures.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Define los periodos de energía y potencia.</p>
                </div>

                <div>
                    <label style={labelStyle}>Tipo de Precio</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.6 : 1 }}>
                            <input
                                type="radio"
                                name="is_indexed"
                                checked={!data.is_indexed}
                                onChange={() => !isEdit && onChange('is_indexed', false)}
                                disabled={isEdit}
                                style={{ color: '#2563eb', width: '1rem', height: '1rem' }}
                            />
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>Fijo</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isEdit ? 'not-allowed' : 'pointer', opacity: isEdit ? 0.6 : 1 }}>
                            <input
                                type="radio"
                                name="is_indexed"
                                checked={!!data.is_indexed}
                                onChange={() => !isEdit && onChange('is_indexed', true)}
                                disabled={isEdit}
                                style={{ color: '#2563eb', width: '1rem', height: '1rem' }}
                            />
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>Indexado (OMIE)</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Válida Desde</label>
                    <input
                        type="date"
                        style={inputStyle}
                        value={data.valid_from || ''}
                        onChange={(e) => onChange('valid_from', e.target.value)}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Código Oferta (Opcional)</label>
                    <input
                        type="text"
                        style={inputStyle}
                        value={data.code || ''}
                        onChange={(e) => onChange('code', e.target.value)}
                        placeholder="Ref. Interna"
                    />
                </div>


            </div>
        </div>
    );
}

