import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { Upload } from 'lucide-react'

interface Supplier {
    id: string
    name: string
    slug: string
    website: string | null
}

interface TariffComponent {
    component_type: 'energy_price' | 'power_price' | 'fixed_fee'
    period?: string
    price_eur_kwh?: number
    price_eur_kw_year?: number
    fixed_price_eur_month?: number
}

interface TariffFormState {
    supplier_id: string
    tariff_name: string
    tariff_code: string
    tariff_type: '2.0TD' | '3.0TD' | '6.1TD'
    valid_from: string
    components: TariffComponent[]
}

const INITIAL_STATE: TariffFormState = {
    supplier_id: '',
    tariff_name: '',
    tariff_code: '',
    tariff_type: '2.0TD',
    valid_from: new Date().toISOString().split('T')[0],
    components: []
}

export function TariffEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(!!id)
    const [saving, setSaving] = useState(false)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [form, setForm] = useState<TariffFormState>(INITIAL_STATE)

    async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n')
            const newComponents: TariffComponent[] = []

            lines.slice(1).forEach(line => {
                const parts = line.split(',').map(s => s.trim())
                if (parts.length < 3) return
                const [type, period, price] = parts

                if (type === 'energy_price') {
                    newComponents.push({ component_type: 'energy_price', period, price_eur_kwh: parseFloat(price) })
                } else if (type === 'power_price') {
                    newComponents.push({ component_type: 'power_price', period, price_eur_kw_year: parseFloat(price) })
                } else if (type === 'fixed_fee') {
                    newComponents.push({ component_type: 'fixed_fee', fixed_price_eur_month: parseFloat(price) })
                }
            })

            if (newComponents.length > 0) {
                setForm(prev => ({ ...prev, components: newComponents }))
            }
        }
        reader.readAsText(file)
    }

    useEffect(() => {
        loadSuppliers()
        if (id) {
            loadTariff(id)
        } else {
            updateComponentsForType('2.0TD')
        }
    }, [id])

    async function loadSuppliers() {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name, slug, website')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            setSuppliers(data || [])
        } catch (error) {
            console.error('Error loading suppliers:', error)
        }
    }

    async function loadTariff(tariffId: string) {
        try {
            const { data: tariff, error: tError } = await supabase
                .from('tariff_versions')
                .select('*')
                .eq('id', tariffId)
                .single()

            if (tError) throw tError

            const { data: components, error: cError } = await supabase
                .from('tariff_components')
                .select('*')
                .eq('tariff_version_id', tariffId)

            if (cError) throw cError

            // Find supplier ID by name
            const { data: supplierData } = await supabase
                .from('suppliers')
                .select('id')
                .eq('name', tariff.supplier_name)
                .single()

            setForm({
                supplier_id: supplierData?.id || '',
                tariff_name: tariff.tariff_name,
                tariff_code: tariff.tariff_code || '',
                tariff_type: tariff.tariff_type as any,
                valid_from: tariff.valid_from,
                components: components || []
            })
        } catch (error) {
            console.error('Error loading tariff:', error)
            alert('Error al cargar la tarifa')
        } finally {
            setLoading(false)
        }
    }

    function updateComponentsForType(type: string) {
        let periods: string[] = []

        if (type === '2.0TD') {
            periods = ['P1', 'P2', 'P3']
        } else {
            periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
        }

        const newComponents: TariffComponent[] = []

        // Energy prices
        periods.forEach(p => {
            newComponents.push({ component_type: 'energy_price', period: p, price_eur_kwh: 0 })
        })

        // Power prices (2.0TD only has 2 periods)
        periods.forEach(p => {
            if (type === '2.0TD' && p !== 'P1' && p !== 'P2') return
            newComponents.push({ component_type: 'power_price', period: p, price_eur_kw_year: 0 })
        })

        // Fixed fee
        newComponents.push({ component_type: 'fixed_fee', fixed_price_eur_month: 0 })

        setForm(prev => ({ ...prev, tariff_type: type as any, components: newComponents }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!form.supplier_id) {
            alert('Por favor selecciona una comercializadora')
            return
        }

        setSaving(true)

        try {
            const { data: profile } = await supabase.from('users').select('company_id').single()
            if (!profile) throw new Error('No se pudo obtener el perfil de usuario')

            // Find supplier name
            const selectedSupplier = suppliers.find(s => s.id === form.supplier_id)
            if (!selectedSupplier) throw new Error('Comercializadora inválida')

            const tariffData: any = {
                company_id: profile.company_id,
                supplier_name: selectedSupplier.name,
                tariff_name: form.tariff_name,
                tariff_code: form.tariff_code || null,
                tariff_type: form.tariff_type,
                valid_from: form.valid_from,
                is_active: true
            }

            let versionId = id

            if (id) {
                const { error } = await supabase
                    .from('tariff_versions')
                    .update(tariffData)
                    .eq('id', id)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from('tariff_versions')
                    .insert(tariffData)
                    .select()
                    .single()

                if (error) throw error
                versionId = data.id
            }

            // Delete existing components
            if (id) {
                await supabase.from('tariff_components').delete().eq('tariff_version_id', id)
            }

            // Insert new components
            const componentsToInsert = form.components
                .filter(c => {
                    if (c.component_type === 'energy_price') return c.price_eur_kwh !== undefined && (c.price_eur_kwh as number) > 0
                    if (c.component_type === 'power_price') return c.price_eur_kw_year !== undefined && (c.price_eur_kw_year as number) > 0
                    if (c.component_type === 'fixed_fee') return true
                    return false
                })
                .map(c => ({
                    company_id: profile.company_id,
                    tariff_version_id: versionId,
                    ...c
                }))

            if (componentsToInsert.length > 0) {
                const { error: cError } = await supabase
                    .from('tariff_components')
                    .insert(componentsToInsert)

                if (cError) throw cError
            }

            navigate('/admin/tariffs')
        } catch (error) {
            console.error('Error saving tariff:', error)
            alert('Error al guardar la tarifa: ' + (error as any).message)
        } finally {
            setSaving(false)
        }
    }

    function updateComponent(type: 'energy_price' | 'power_price' | 'fixed_fee', period: string | undefined, field: string, value: number) {
        const newComponents = [...form.components]
        let index: number

        if (type === 'fixed_fee') {
            index = newComponents.findIndex(c => c.component_type === type)
        } else {
            index = newComponents.findIndex(c => c.component_type === type && c.period === period)
        }

        if (index >= 0) {
            (newComponents[index] as any)[field] = value
            setForm({ ...form, components: newComponents })
        }
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--border)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-muted)' }}>Cargando tarifa...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        marginBottom: '1.5rem',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    ← Volver a tarifas
                </button>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em'
                }}>
                    {id ? 'Editar Tarifa' : 'Nueva Tarifa'}
                </h1>
                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.95rem'
                }}>
                    {id ? 'Modifica los datos de la tarifa existente' : 'Configura una nueva tarifa eléctrica manualmente o importa desde archivo'}
                </p>
            </div>

            {!id && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '2px dashed var(--border)',
                        padding: '1.5rem',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <label style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload size={24} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.25rem' }}>Importar CSV</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Carga precios masivamente</p>
                            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* General Info */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '1.5rem',
                        color: 'var(--text-main)'
                    }}>
                        Información General
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem'
                            }}>
                                Comercializadora <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <select
                                required
                                value={form.supplier_id}
                                onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <option value="">Selecciona una comercializadora</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem'
                            }}>
                                Nombre de Tarifa <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: One Luz, Tempo Happy..."
                                value={form.tariff_name}
                                onChange={e => setForm({ ...form, tariff_name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem'
                            }}>
                                Código (Opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: ENONE2024"
                                value={form.tariff_code}
                                onChange={e => setForm({ ...form, tariff_code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem'
                            }}>
                                Tipo de Peaje <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <select
                                value={form.tariff_type}
                                onChange={e => {
                                    if (confirm('Cambiar el tipo reiniciará los precios configurados. ¿Continuar?')) {
                                        updateComponentsForType(e.target.value)
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <option value="2.0TD">2.0TD (Doméstico)</option>
                                <option value="3.0TD">3.0TD (Pequeña Empresa)</option>
                                <option value="6.1TD">6.1TD (Gran Empresa)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem'
                            }}>
                                Válida Desde <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={form.valid_from}
                                onChange={e => setForm({ ...form, valid_from: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Energy Pricing */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            marginBottom: '0.25rem'
                        }}>
                            Término de Energía
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Precio variable según consumo (€/kWh)
                        </p>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        {form.components.filter(c => c.component_type === 'energy_price').map((comp) => (
                            <div key={`energy-${comp.period}`}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-main)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Periodo {comp.period} <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        required
                                        placeholder="0.000000"
                                        value={comp.price_eur_kwh || ''}
                                        onChange={e => updateComponent('energy_price', comp.period, 'price_eur_kwh', parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'monospace',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        pointerEvents: 'none'
                                    }}>
                                        €/kWh
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Power Pricing */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            marginBottom: '0.25rem'
                        }}>
                            Término de Potencia
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Precio fijo anual por potencia contratada (€/kW/año)
                        </p>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        {form.components.filter(c => c.component_type === 'power_price').map((comp) => (
                            <div key={`power-${comp.period}`}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-main)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Periodo {comp.period} <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={comp.price_eur_kw_year || ''}
                                        onChange={e => updateComponent('power_price', comp.period, 'price_eur_kw_year', parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 3.5rem 0.625rem 0.875rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'monospace',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.7rem',
                                        color: 'var(--text-muted)',
                                        pointerEvents: 'none'
                                    }}>
                                        €/kW/año
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed Fee */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            marginBottom: '0.25rem'
                        }}>
                            Otros Cargos
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Cuotas fijas mensuales (opcional)
                        </p>
                    </div>
                    <div style={{ maxWidth: '300px' }}>
                        {form.components.filter(c => c.component_type === 'fixed_fee').map((comp) => (
                            <div key="fixed-fee">
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-main)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Cuota Fija Mensual
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={comp.fixed_price_eur_month || ''}
                                        onChange={e => updateComponent('fixed_fee', undefined, 'fixed_price_eur_month', parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 2.75rem 0.625rem 0.875rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontFamily: 'monospace',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        pointerEvents: 'none'
                                    }}>
                                        €/mes
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-light)'
                }}>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/tariffs')}
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            border: '1px solid var(--border)',
                            backgroundColor: 'white',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--border-light)'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '0.625rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            border: 'none',
                            backgroundColor: saving ? 'var(--text-muted)' : 'var(--primary)',
                            color: 'white',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: saving ? 0.6 : 1,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={(e) => {
                            if (!saving) {
                                e.currentTarget.style.backgroundColor = 'var(--primary-hover)'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!saving) {
                                e.currentTarget.style.backgroundColor = 'var(--primary)'
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        {saving ? 'Guardando...' : id ? 'Actualizar Tarifa' : 'Crear Tarifa'}
                    </button>
                </div>
            </form>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
