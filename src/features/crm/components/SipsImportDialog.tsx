import { useState } from 'react'
import { Database, X, Loader2, CheckCircle } from 'lucide-react'
import type { SipsSupplyData } from '@/features/integrations/lib/sips-service'
import { importSipsData } from '@/features/integrations/lib/sips-service'

interface SipsImportDialogProps {
    supplyPointId: string
    cups: string
    onClose: () => void
    onSuccess: () => void
}

const TARIFF_TYPES = ['2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD']

export function SipsImportDialog({ supplyPointId, cups, onClose, onSuccess }: SipsImportDialogProps) {
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<SipsSupplyData>({
        cups,
        distributor: '',
        contracted_power_p1_kw: undefined,
        contracted_power_p2_kw: undefined,
        contracted_power_p3_kw: undefined,
        contracted_power_p4_kw: undefined,
        contracted_power_p5_kw: undefined,
        contracted_power_p6_kw: undefined,
        annual_consumption_kwh: undefined,
        tariff_type: '',
        meter_type: '',
        voltage_level: '',
        connection_date: '',
        last_meter_reading_date: '',
        point_type: undefined,
        current_supplier: '',
    })

    const handleChange = (field: keyof SipsSupplyData, value: string | number | undefined) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleNumberChange = (field: keyof SipsSupplyData, raw: string) => {
        const val = raw === '' ? undefined : parseFloat(raw)
        handleChange(field, val)
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const result = await importSipsData(supplyPointId, form)
        setSaving(false)
        if (result.ok) {
            setSaved(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1000)
        } else {
            setError(result.error || 'Error al importar datos SIPS')
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.5rem 0.625rem', borderRadius: '6px',
        border: '1px solid var(--border)', background: 'white', fontSize: '0.85rem',
    }
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
        marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em',
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: '14px', width: '600px', maxHeight: '90vh',
                    overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Database size={16} color="#2563eb" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Importar datos SIPS</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cups}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Introduce los datos del SIPS (Sistema de Información de Puntos de Suministro)
                        proporcionados por la distribuidora para este punto de suministro.
                    </p>

                    {/* Row: Distributor + Tariff */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Distribuidora</label>
                            <input
                                style={inputStyle}
                                placeholder="Ej: i-DE, e-distribución..."
                                value={form.distributor || ''}
                                onChange={e => handleChange('distributor', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Tipo de Tarifa</label>
                            <select
                                style={inputStyle}
                                value={form.tariff_type || ''}
                                onChange={e => handleChange('tariff_type', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {TARIFF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Powers Section */}
                    <div>
                        <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Potencias Contratadas (kW)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {([1, 2, 3, 4, 5, 6] as const).map(p => (
                                <div key={p}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>P{p}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        style={inputStyle}
                                        placeholder={`P${p}`}
                                        value={form[`contracted_power_p${p}_kw` as keyof SipsSupplyData] ?? ''}
                                        onChange={e => handleNumberChange(`contracted_power_p${p}_kw` as keyof SipsSupplyData, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Consumption */}
                    <div>
                        <label style={labelStyle}>Consumo Anual (kWh)</label>
                        <input
                            type="number"
                            style={inputStyle}
                            placeholder="Ej: 12500"
                            value={form.annual_consumption_kwh ?? ''}
                            onChange={e => handleNumberChange('annual_consumption_kwh', e.target.value)}
                        />
                    </div>

                    {/* Row: Meter + Voltage + Point Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Tipo Contador</label>
                            <select
                                style={inputStyle}
                                value={form.meter_type || ''}
                                onChange={e => handleChange('meter_type', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="telemedida">Telemedida</option>
                                <option value="telegestion">Telegestión</option>
                                <option value="convencional">Convencional</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Nivel de Tensión</label>
                            <select
                                style={inputStyle}
                                value={form.voltage_level || ''}
                                onChange={e => handleChange('voltage_level', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="BT">BT (Baja Tensión)</option>
                                <option value="AT">AT (Alta Tensión)</option>
                                <option value="MT">MT (Media Tensión)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Tipo Punto</label>
                            <input
                                type="number"
                                style={inputStyle}
                                placeholder="1-5"
                                value={form.point_type ?? ''}
                                onChange={e => handleNumberChange('point_type', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row: Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Fecha de Conexión</label>
                            <input
                                type="date"
                                style={inputStyle}
                                value={form.connection_date || ''}
                                onChange={e => handleChange('connection_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Última Lectura Contador</label>
                            <input
                                type="date"
                                style={inputStyle}
                                value={form.last_meter_reading_date || ''}
                                onChange={e => handleChange('last_meter_reading_date', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Current Supplier */}
                    <div>
                        <label style={labelStyle}>Comercializadora Actual</label>
                        <input
                            style={inputStyle}
                            placeholder="Ej: Iberdrola, Endesa..."
                            value={form.current_supplier || ''}
                            onChange={e => handleChange('current_supplier', e.target.value)}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem', borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || saved}
                        style={{
                            padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                            background: saved ? '#10b981' : '#2563eb', color: 'white',
                            cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> :
                         saved ? <><CheckCircle size={14} /> Importado</> :
                         <><Database size={14} /> Importar SIPS</>}
                    </button>
                </div>
            </div>
        </div>
    )
}
