import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { rankTariffs } from '../lib/rankTariffs'
import { useNavigate } from 'react-router-dom'
import type { TariffVersion, ComparisonResult, ComparisonMode, ComparisonInput } from '@/shared/types'
import { useComparatorState } from '../hooks/useComparatorState'
import { InvoiceUploader } from './InvoiceUploader'
import { SaveComparisonDialog } from './SaveComparisonDialog'

export function ComparatorForm() {
    const navigate = useNavigate()
    const [searching, setSearching] = useState(false)

    // Use persistence hook
    const { state, updateState, clearState } = useComparatorState()

    const [results, setResults] = useState<ComparisonResult[]>([])
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name')
        setSuppliers(data || [])
    }

    // Helper to normalize European number format (comma to dot, remove thousands separators)
    const normalizeNumber = (value: any): string => {
        if (!value) return ''
        let str = value.toString().trim()
            .replace(/[€$£¥\sA-Za-z]/g, '') // Remove currency, spaces, letters

        // Handle European format: 1.234,56 -> 1234.56
        // If it contains both . and ,
        if (str.includes('.') && str.includes(',')) {
            const dotIndex = str.indexOf('.')
            const commaIndex = str.indexOf(',')

            if (dotIndex < commaIndex) {
                // 1.234,56 -> Remove dot, replace comma with dot
                str = str.replace(/\./g, '').replace(',', '.')
            } else {
                // 1,234.56 -> Remove comma
                str = str.replace(/,/g, '')
            }
        } else if (str.includes(',')) {
            // Only comma, assume decimal separator (Spain)
            str = str.replace(',', '.')
        } else if (str.includes('.') && (str.match(/\./g) || []).length > 1) {
            // Multiple dots (1.234.567) -> remove all
            str = str.replace(/\./g, '')
        }

        // Final cleanup
        return str.replace(/[^\d.-]/g, '')
    }

    const handleDataExtracted = (data: any) => {
        console.log('📄 OCR Data Received:', data)
        const updates: any = {}

        if (data.customer_name) updates.customerName = data.customer_name
        if (data.cif) updates.cif = data.cif
        if (data.tariff_type) updates.tariffType = data.tariff_type
        if (data.annual_consumption) updates.consumption = normalizeNumber(data.annual_consumption)
        if (data.contracted_power) updates.power = normalizeNumber(data.contracted_power)
        if (data.cups) updates.cups = data.cups
        if (data.current_cost) updates.currentCost = normalizeNumber(data.current_cost)

        // Map power periods
        if (data.power_p1) updates.powerP1 = normalizeNumber(data.power_p1)
        if (data.power_p2) updates.powerP2 = normalizeNumber(data.power_p2)
        if (data.power_p3) updates.powerP3 = normalizeNumber(data.power_p3)
        if (data.power_p4) updates.powerP4 = normalizeNumber(data.power_p4)
        if (data.power_p5) updates.powerP5 = normalizeNumber(data.power_p5)
        if (data.power_p6) updates.powerP6 = normalizeNumber(data.power_p6)

        // Calculate consumption percentages from OCR values (which are likely kWh)
        const p1 = parseFloat(normalizeNumber(data.p1_consumption_pct) || '0')
        const p2 = parseFloat(normalizeNumber(data.p2_consumption_pct) || '0')
        const p3 = parseFloat(normalizeNumber(data.p3_consumption_pct) || '0')
        const p4 = parseFloat(normalizeNumber(data.p4_consumption_pct) || '0')
        const p5 = parseFloat(normalizeNumber(data.p5_consumption_pct) || '0')
        const p6 = parseFloat(normalizeNumber(data.p6_consumption_pct) || '0')

        const totalConsumption = p1 + p2 + p3 + p4 + p5 + p6

        if (totalConsumption > 0) {
            updates.consP1 = ((p1 / totalConsumption) * 100).toFixed(2)
            updates.consP2 = ((p2 / totalConsumption) * 100).toFixed(2)
            updates.consP3 = ((p3 / totalConsumption) * 100).toFixed(2)
            if (p4 > 0) updates.consP4 = ((p4 / totalConsumption) * 100).toFixed(2)
            if (p5 > 0) updates.consP5 = ((p5 / totalConsumption) * 100).toFixed(2)
            if (p6 > 0) updates.consP6 = ((p6 / totalConsumption) * 100).toFixed(2)

            // Auto-fill total annual consumption if missing or 0
            if (!updates.consumption || parseFloat(updates.consumption) === 0) {
                updates.consumption = totalConsumption.toFixed(0)
            }
        }

        if (data.current_supplier && typeof data.current_supplier === 'string') {
            // Try to find supplier by name
            const foundSupplier = suppliers.find(s =>
                s.name.toLowerCase().includes(data.current_supplier.toLowerCase()) ||
                data.current_supplier.toLowerCase().includes(s.name.toLowerCase())
            );
            if (foundSupplier) {
                updates.currentSupplier = foundSupplier.name
            } else {
                updates.currentSupplier = data.current_supplier
            }
        }

        console.log('🔄 Updates to apply:', updates)
        updateState(updates)

        if (data.cif) {
            checkExistingClientByCIF(data.cif)
        }
    }

    const checkExistingClientByCIF = async (cif: string) => {
        // setCupsNotFound(false) - Removed
        console.log('🔍 Checking existing client by CIF:', cif)

        const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('cif', cif)
            .maybeSingle()

        if (customerData) {
            console.log('✅ Customer found by CIF:', customerData)
            updateState({ selectedCustomer: customerData.id })
        } else {
            console.log('ℹ️ New customer (CIF not found)')
            updateState({ selectedCustomer: '' })
        }
    }

    const handleCompare = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearching(true)

        try {
            const inputData: ComparisonInput = {
                cif: state.cif || 'MOCK', // Use extracted CIF if available
                customer_type: 'empresa',
                annual_consumption_kwh: parseFloat(state.consumption),
                contracted_power_kw: parseFloat(state.power),
                tariff_type: state.tariffType,
                consumption_distribution: (state.consP1 || state.consP2) ? {
                    P1: parseFloat(state.consP1) || 0,
                    P2: parseFloat(state.consP2) || 0,
                    P3: parseFloat(state.consP3) || 0,
                    P4: parseFloat(state.consP4) || 0,
                    P5: parseFloat(state.consP5) || 0,
                    P6: parseFloat(state.consP6) || 0,
                } : undefined,
                reactive_energy_kvarh: parseFloat(state.reactiveEnergy) || 0,
                max_demand_kw: parseFloat(state.maxDemand) || 0,
                contracted_power_p1_kw: parseFloat(state.powerP1) || undefined,
                contracted_power_p2_kw: parseFloat(state.powerP2) || undefined,
                contracted_power_p3_kw: parseFloat(state.powerP3) || undefined,
                contracted_power_p4_kw: parseFloat(state.powerP4) || undefined,
                contracted_power_p5_kw: parseFloat(state.powerP5) || undefined,
                contracted_power_p6_kw: parseFloat(state.powerP6) || undefined,
            }

            const { data: tariffs, error } = await supabase
                .from('tariff_versions')
                .select('*, tariff_components(*)')
                .eq('is_active', true)
                .eq('tariff_type', state.tariffType)

            if (error) throw error

            const rankedResults = rankTariffs(
                tariffs as TariffVersion[],
                inputData,
                {
                    mode: state.mode,
                    currentAnnualCostEur: state.currentCost ? parseFloat(state.currentCost) * 12 : undefined // Crude estimation if monthly, or annual? Label says €/mes
                }
            )

            // Adjust annual cost comparison if user entered monthly cost
            // The rankTariffs might expect annual cost to calculate savings, 
            // but for now let's just pass what we have. 
            // If the label is "Coste Factura Actual (€/mes)", then "Annual" is * 12.

            setResults(rankedResults)
        } catch (err) {
            console.error(err)
            alert('Error en la comparativa')
        } finally {
            setSearching(false)
        }
    }

    const handleClear = () => {
        clearState()
        setResults([])
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Comparador de Tarifas</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={() => navigate('/comparator/history')} style={{ fontSize: '0.9rem', color: '#0070f3', background: 'none', border: '1px solid #0070f3', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}>
                        Ver Historial
                    </button>
                    <button onClick={handleClear} style={{ fontSize: '0.9rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Limpiar formulario
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Form Panel */}
                <section style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                    <InvoiceUploader onDataExtracted={handleDataExtracted} />

                    {/* Create Client Banner if data extracted but new client? 
                        Maybe simplified logic here as per user request.
                    */}

                    <form onSubmit={handleCompare} style={{ display: 'grid', gap: '1rem' }}>

                        {/* Client Name Input (Replaces Dropdown) */}
                        <div>
                            <label style={labelStyle}>Nombre del Cliente (Opcional)</label>
                            <input
                                type="text"
                                value={state.customerName}
                                onChange={(e) => updateState({ customerName: e.target.value })}
                                placeholder="Nombre del cliente o empresa"
                                style={inputStyle}
                            />
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />


                        {/* INPUTS GRID (Compact) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.8rem', alignItems: 'end' }}>

                            {/* Row 0: CUPS & Supplier (New) */}
                            <div style={{ gridColumn: 'span 12' }}>
                                <label style={labelStyleCompact}>CUPS</label>
                                <input
                                    type="text"
                                    value={state.cups}
                                    onChange={e => updateState({ cups: e.target.value })}
                                    placeholder="ES00..."
                                    style={inputStyleCompact}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 6' }}>
                                <label style={labelStyleCompact}>Comercializadora Actual</label>
                                <select
                                    value={state.currentSupplier}
                                    onChange={e => updateState({ currentSupplier: e.target.value })}
                                    style={inputStyleCompact}
                                >
                                    <option value="">Seleccionar...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                    {state.currentSupplier && !suppliers.find(s => s.name === state.currentSupplier) && (
                                        <option value={state.currentSupplier}>{state.currentSupplier} (Detectada)</option>
                                    )}
                                </select>
                            </div>

                            <div style={{ gridColumn: 'span 6' }}>
                                <label style={labelStyleCompact}>Coste Factura Actual (€/mes)</label>
                                <input
                                    type="number"
                                    value={state.currentCost}
                                    onChange={e => updateState({ currentCost: e.target.value })}
                                    placeholder="0.00"
                                    style={inputStyleCompact}
                                />
                            </div>

                            {/* Row 1: Main Inputs */}
                            <div style={{ gridColumn: 'span 4' }}>
                                <label style={labelStyleCompact}>Consumo Anual (kWh)</label>
                                <input type="number" value={state.consumption} onChange={e => updateState({ consumption: e.target.value })} required style={inputStyleCompact} />
                            </div>
                            <div style={{ gridColumn: 'span 4' }}>
                                <label style={labelStyleCompact}>Potencia (kW)</label>
                                <input type="number" value={state.power} onChange={e => updateState({ power: e.target.value })} required style={inputStyleCompact} />
                            </div>
                            <div style={{ gridColumn: 'span 4' }}>
                                <label style={labelStyleCompact}>Tarifa</label>
                                <select value={state.tariffType} onChange={e => updateState({ tariffType: e.target.value })} style={inputStyleCompact}>
                                    <option value="2.0TD">2.0TD (&lt;15kW)</option>
                                    <option value="3.0TD">3.0TD (&gt;15kW)</option>
                                    <option value="6.1TD">6.1TD</option>
                                </select>
                            </div>

                            {/* Row 2: Periods Consumption */}
                            <div style={{ gridColumn: 'span 12', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.3rem' }}>
                                    CONSUMO POR PERIODOS (%) {state.tariffType === '2.0TD' ? '- 3 periodos' : '- 6 periodos'}
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: state.tariffType === '2.0TD' ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: '0.4rem' }}>
                                    <input placeholder="P1%" type="number" step="0.01" value={state.consP1} onChange={e => updateState({ consP1: e.target.value })} style={inputStyleMini} />
                                    <input placeholder="P2%" type="number" step="0.01" value={state.consP2} onChange={e => updateState({ consP2: e.target.value })} style={inputStyleMini} />
                                    <input placeholder="P3%" type="number" step="0.01" value={state.consP3} onChange={e => updateState({ consP3: e.target.value })} style={inputStyleMini} />
                                    {state.tariffType !== '2.0TD' && (
                                        <>
                                            <input placeholder="P4%" type="number" step="0.01" value={state.consP4} onChange={e => updateState({ consP4: e.target.value })} style={inputStyleMini} />
                                            <input placeholder="P5%" type="number" step="0.01" value={state.consP5} onChange={e => updateState({ consP5: e.target.value })} style={inputStyleMini} />
                                            <input placeholder="P6%" type="number" step="0.01" value={state.consP6} onChange={e => updateState({ consP6: e.target.value })} style={inputStyleMini} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Periods Power */}
                            <div style={{ gridColumn: 'span 12', marginTop: '0.2rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.3rem' }}>
                                    POTENCIA POR PERIODOS (kW) {state.tariffType === '2.0TD' ? '- 2 periodos' : '- 6 periodos'}
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: state.tariffType === '2.0TD' ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: '0.4rem' }}>
                                    <input placeholder="P1 kW" type="number" value={state.powerP1} onChange={e => updateState({ powerP1: e.target.value })} style={inputStyleMini} />
                                    <input placeholder="P2 kW" type="number" value={state.powerP2} onChange={e => updateState({ powerP2: e.target.value })} style={inputStyleMini} />
                                    {state.tariffType !== '2.0TD' && (
                                        <>
                                            <input placeholder="P3 kW" type="number" value={state.powerP3} onChange={e => updateState({ powerP3: e.target.value })} style={inputStyleMini} />
                                            <input placeholder="P4 kW" type="number" value={state.powerP4} onChange={e => updateState({ powerP4: e.target.value })} style={inputStyleMini} />
                                            <input placeholder="P5 kW" type="number" value={state.powerP5} onChange={e => updateState({ powerP5: e.target.value })} style={inputStyleMini} />
                                            <input placeholder="P6 kW" type="number" value={state.powerP6} onChange={e => updateState({ powerP6: e.target.value })} style={inputStyleMini} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Row 4: Penalties */}
                            <div style={{ gridColumn: 'span 12', display: 'flex', gap: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #eee' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyleCompact}>E. Reactiva (kVArh)</label>
                                    <input type="number" value={state.reactiveEnergy} onChange={e => updateState({ reactiveEnergy: e.target.value })} style={inputStyleCompact} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyleCompact}>Max. Demanda (kW)</label>
                                    <input type="number" value={state.maxDemand} onChange={e => updateState({ maxDemand: e.target.value })} style={inputStyleCompact} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyleCompact}>Modo</label>
                                    <select value={state.mode} onChange={(e) => updateState({ mode: e.target.value as ComparisonMode })} style={inputStyleCompact}>
                                        <option value="client_first">Ahorro</option>
                                        <option value="commercial_first">Margen</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={searching}
                                style={{
                                    gridColumn: 'span 12',
                                    padding: '0.7rem',
                                    background: '#0070f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    marginTop: '0.5rem',
                                    fontSize: '0.9rem',
                                    transition: 'background 0.2s',
                                    opacity: searching ? 0.7 : 1
                                }}
                            >
                                {searching ? 'Calculando...' : 'Obtener Comparativa'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Results Panel */}
                <section>
                    {results.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #ddd' }}>
                            <p style={{ color: '#666' }}>Introduce los datos para ver las mejores ofertas.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Top {results.length} Ofertas Encontradas</h2>
                                <button
                                    onClick={() => setShowSaveDialog(true)}
                                    style={{ padding: '0.4rem 0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                >
                                    Guardar Propuesta
                                </button>
                            </div>

                            {results.map((res, idx) => {

                                return (
                                    <div key={idx} style={{
                                        background: 'white',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        borderLeft: idx === 0 ? '6px solid #10b981' : '1px solid #eee',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{res.tariff_version?.supplier_name || 'Unknown Supplier'}</span>
                                                <h3 style={{ margin: '0.2rem 0' }}>{res.tariff_version?.tariff_name}</h3>

                                                {/* Savings Indicator */}
                                                {state.currentCost && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        {(res.annual_savings_eur || 0) > 0 ? (
                                                            <span style={{ color: '#059669', fontSize: '0.9rem', fontWeight: '600', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                                Ahorro: {Math.round(res.annual_savings_eur || 0)}€ / año
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: '600', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                                Sobrecoste: {Math.round(Math.abs(res.annual_savings_eur || 0))}€ / año
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0070f3' }}>{Math.round(res.annual_cost_eur)}€</span>
                                                <span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>al año (IVA inc.)</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid #f0f0f0', paddingTop: '1rem', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Pago Mensual Estimado</span>
                                                <span style={{ fontWeight: 'bold' }}>{res.monthly_cost_eur}€</span>
                                            </div>
                                            {state.mode === 'commercial_first' && (
                                                <div style={{ background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#92400e' }}>Comisión Líquida</span>
                                                    <span style={{ fontWeight: 'bold', color: '#92400e' }}>{res.commission_eur}€</span>
                                                </div>
                                            )}
                                            {res.calculation_breakdown.penalties && (res.calculation_breakdown.penalties.reactive > 0 || res.calculation_breakdown.penalties.excess_power > 0) && (
                                                <div style={{ background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#991b1b' }}>Penalizaciones</span>
                                                    <span style={{ fontWeight: 'bold', color: '#991b1b' }}>
                                                        {Math.round(res.calculation_breakdown.penalties.reactive + res.calculation_breakdown.penalties.excess_power)}€
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => navigate('/contracts/new', {
                                                    state: {
                                                        prefillData: {
                                                            customerId: state.selectedCustomer,
                                                            tariffVersionId: res.tariff_version?.id,
                                                            cups: state.cups,
                                                            annualValue: Math.round(res.annual_cost_eur)
                                                        }
                                                    }
                                                })}
                                                style={{ marginLeft: 'auto', padding: '0.5rem 1rem', background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                            >
                                                Generar Contrato
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>

            <SaveComparisonDialog
                isOpen={showSaveDialog}
                onClose={() => setShowSaveDialog(false)}
                comparisonData={{
                    consumption_p1: parseFloat(state.consP1) || 0,
                    consumption_p2: parseFloat(state.consP2) || 0,
                    consumption_p3: parseFloat(state.consP3) || 0,
                    consumption_p4: parseFloat(state.consP4) || 0,
                    consumption_p5: parseFloat(state.consP5) || 0,
                    consumption_p6: parseFloat(state.consP6) || 0,
                    contracted_power_p1: parseFloat(state.powerP1) || parseFloat(state.power) || 0,
                    contracted_power_p2: parseFloat(state.powerP2) || parseFloat(state.power) || 0,
                    results: results
                }}
                customerId={state.selectedCustomer}
            />
        </div>
    )
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: '500' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #ddd' }

// Compact Styles
const labelStyleCompact: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: '600', color: '#555' }
const inputStyleCompact: React.CSSProperties = { width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }
const inputStyleMini: React.CSSProperties = { width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.8rem', textAlign: 'center' }
