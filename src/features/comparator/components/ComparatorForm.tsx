import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { rankTariffs } from '../lib/rankTariffs'
import { useNavigate } from 'react-router-dom'
import type { TariffVersion, ComparisonResult, ComparisonMode, ComparisonInput } from '@/shared/types'
import { useComparatorState } from '../hooks/useComparatorState'
import { InvoiceUploader } from './InvoiceUploader'
import { SaveComparisonDialog } from './SaveComparisonDialog'
import { useToast } from '@/hooks/use-toast'
import { GAS_CONSTANTS } from '@/shared/constants'
import { Zap, Flame } from 'lucide-react'

import { mapOcrData } from '../lib/ocrMapper'

export function ComparatorForm() {
    const navigate = useNavigate()
    const [searching, setSearching] = useState(false)

    // Use persistence hook
    const { state, updateState, clearState } = useComparatorState()

    const [results, setResults] = useState<ComparisonResult[]>([])
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([])
    const { toast } = useToast()

    useEffect(() => {
        fetchSuppliers()
    }, [])

    // Auto-select Gas Tariff based on consumption
    useEffect(() => {
        if (state.supplyType === 'gas' && state.consumption) {
            const consumption = parseFloat(state.consumption)
            if (!isNaN(consumption)) {
                let suggested = 'RL.4'
                if (consumption <= GAS_CONSTANTS.THRESHOLDS.RL1) suggested = 'RL.1'
                else if (consumption <= GAS_CONSTANTS.THRESHOLDS.RL2) suggested = 'RL.2'
                else if (consumption <= GAS_CONSTANTS.THRESHOLDS.RL3) suggested = 'RL.3'

                if (state.tariffType !== suggested) {
                    updateState({ tariffType: suggested })
                }
            }
        }
    }, [state.consumption, state.supplyType])

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name')
        setSuppliers(data || [])
    }

    const handleDataExtracted = (data: Record<string, string | number | null | undefined>) => {
        const updates = mapOcrData(data, suppliers);
        // Force update state with new data, this might need to clear previous values if we want a fresh start
        // But mapOcrData only returns found keys.
        // If we want to ensure tariff type updates even if state has one, updateState merges it.
        // The issue "fill fields but not change tariff type" suggests maybe the tariff type from OCR wasn't matching
        // the dropdown values, so it was ignored or set to something invalid?
        // Now that we normalized it in mapOcrData, it should work.
        updateState(updates);

        if (data.cif && typeof data.cif === 'string') {
            checkExistingClientByCIF(data.cif);
        }
    }

    const handleSupplyChange = (type: 'electricity' | 'gas') => {
        // Keep only common fields: customerName, cif, cups
        const commonState = {
            customerName: state.customerName,
            cif: state.cif,
            cups: state.cups,
            supplyType: type,
            tariffType: type === 'electricity' ? '2.0TD' : 'RL.1',
            // Clear specific fields
            consumption: '',
            power: '',
            currentCost: '',
            currentSupplier: '', // User said "name and cups" are same, usually supplier might differ? Let's clear it to be safe or keep it?
            // "los unicos que son los mismos son nombre y cups". Use said cups too. Supplier is not mentioned as same.
            // Let's clear supplier.

            // Clear periods
            powerP1: '', powerP2: '', powerP3: '', powerP4: '', powerP5: '', powerP6: '',
            consP1: '', consP2: '', consP3: '', consP4: '', consP5: '', consP6: '',

            // Clear penalties/other
            reactiveEnergy: '',
            maxDemand: '',
            conversionFactor: '',

            // Reset results
            mode: state.mode
        };

        // We need to update state with these values. 
        // value: '' will overwrite existing values in the merge.
        updateState(commonState);
        setResults([]); // Clear results on switch
    }

    const checkExistingClientByCIF = async (cif: string) => {
        const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('cif', cif)
            .maybeSingle()

        if (customerData) {
            updateState({ selectedCustomer: customerData.id })
        } else {
            updateState({ selectedCustomer: '' })
        }
    }

    const handleCompare = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSearching(true)

        try {
            const inputState = state

            // STRICT VALIDATION
            const errors: string[] = []

            if (!inputState.consumption || parseFloat(inputState.consumption) <= 0) {
                errors.push("Consumo Anual (kWh)")
            }
            // Power validation only for Electricity
            if (inputState.supplyType === 'electricity' && (!inputState.power || parseFloat(inputState.power) <= 0)) {
                errors.push("Potencia Contratada (kW)")
            }
            if (!inputState.tariffType) {
                errors.push("Tipo de Tarifa")
            }

            if (errors.length > 0) {
                toast({
                    title: "Faltan datos obligatorios",
                    description: `Por favor, rellena: ${errors.join(", ")}`,
                    variant: "destructive"
                })
                setSearching(false)
                return
            }

            const inputData: ComparisonInput = {
                cif: inputState.cif || 'MOCK',
                customer_type: 'empresa',
                annual_consumption_kwh: parseFloat(inputState.consumption),
                contracted_power_kw: inputState.supplyType === 'electricity' ? parseFloat(inputState.power) : 0,
                tariff_type: inputState.tariffType,
                consumption_distribution: (inputState.supplyType === 'electricity' && (inputState.consP1 || inputState.consP2)) ? {
                    P1: parseFloat(inputState.consP1) || 0,
                    P2: parseFloat(inputState.consP2) || 0,
                    P3: parseFloat(inputState.consP3) || 0,
                    P4: parseFloat(inputState.consP4) || 0,
                    P5: parseFloat(inputState.consP5) || 0,
                    P6: parseFloat(inputState.consP6) || 0,
                } : undefined,
                reactive_energy_kvarh: parseFloat(inputState.reactiveEnergy) || 0,
                max_demand_kw: parseFloat(inputState.maxDemand) || 0,
                contracted_power_p1_kw: parseFloat(inputState.powerP1) || undefined,
                contracted_power_p2_kw: parseFloat(inputState.powerP2) || undefined,
                contracted_power_p3_kw: parseFloat(inputState.powerP3) || undefined,
                contracted_power_p4_kw: parseFloat(inputState.powerP4) || undefined,
                contracted_power_p5_kw: parseFloat(inputState.powerP5) || undefined,
                contracted_power_p6_kw: parseFloat(inputState.powerP6) || undefined,
            }

            const { data: tariffs, error } = await supabase
                .from('tariff_versions')
                .select('*, tariff_components(*)')
                .eq('is_active', true)
                .eq('tariff_type', inputState.tariffType)

            if (error) throw error

            const results = rankTariffs(
                tariffs as TariffVersion[],
                inputData,
                {
                    mode: inputState.mode,
                    currentAnnualCostEur: inputState.currentCost ? parseFloat(inputState.currentCost) * 12 : undefined
                }
            )

            setResults(results)

        } catch (err) {
            console.error(err)
            toast({ title: 'Error', description: 'Error en la comparativa. Verifica los datos.', variant: 'destructive' })
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

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary tour-comparator-history-btn" onClick={() => navigate('/comparator/history')} style={{ fontSize: '0.9rem' }}>
                        Ver Historial
                    </button>
                    <button onClick={handleClear} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Limpiar formulario
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Form Panel */}
                <section style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>

                    <div className="tour-comparator-uploader">
                        <InvoiceUploader onDataExtracted={handleDataExtracted} />
                    </div>

                    {/* Create Client Banner if data extracted but new client? 
                        Maybe simplified logic here as per user request.
                    */}

                    <form className="tour-comparator-form" onSubmit={handleCompare} style={{ display: 'grid', gap: '1rem' }}>

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

                        {/* UTILITY TOGGLE */}
                        <div style={{ display: 'flex', background: '#f3f4f6', padding: '0.3rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => handleSupplyChange('electricity')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: state.supplyType === 'electricity' ? 'white' : 'transparent',
                                    color: state.supplyType === 'electricity' ? '#0070f3' : '#6b7280',
                                    boxShadow: state.supplyType === 'electricity' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Zap size={16} /> Electricidad
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSupplyChange('gas')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: state.supplyType === 'gas' ? 'white' : 'transparent',
                                    color: state.supplyType === 'gas' ? '#f59e0b' : '#6b7280',
                                    boxShadow: state.supplyType === 'gas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Flame size={16} /> Gas
                            </button>
                        </div>


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

                            {state.supplyType === 'electricity' ? (
                                <>
                                    <div style={{ gridColumn: 'span 4' }} key="elec-power">
                                        <label style={labelStyleCompact}>Potencia (kW)</label>
                                        <input type="number" value={state.power} onChange={e => updateState({ power: e.target.value })} required style={inputStyleCompact} />
                                    </div>
                                    <div style={{ gridColumn: 'span 4' }} key="elec-tariff">
                                        <label style={labelStyleCompact}>Tarifa</label>
                                        <select value={state.tariffType} onChange={e => updateState({ tariffType: e.target.value })} style={inputStyleCompact}>
                                            <option value="2.0TD">2.0TD (&lt;15kW)</option>
                                            <option value="3.0TD">3.0TD (&gt;15kW)</option>
                                            <option value="6.1TD">6.1TD</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ gridColumn: 'span 4' }} key="gas-manual-calc">
                                        <label style={labelStyleCompact}>Consumo (m3) - Calc.</label>
                                        <input
                                            type="number"
                                            placeholder="Opcional"
                                            onChange={e => {
                                                const m3 = parseFloat(e.target.value);
                                                const factor = parseFloat(state.conversionFactor) || GAS_CONSTANTS.CONVERSION.KWH_PER_M3;
                                                if (!isNaN(m3)) {
                                                    updateState({ consumption: (m3 * factor).toFixed(0) })
                                                }
                                            }}
                                            style={inputStyleCompact}
                                        />
                                    </div>
                                    <div style={{ gridColumn: 'span 4' }} key="gas-tariff">
                                        <label style={labelStyleCompact}>Tarifa (Auto)</label>
                                        <select value={state.tariffType} onChange={e => updateState({ tariffType: e.target.value })} style={inputStyleCompact}>
                                            <option value="RL.1">RL.1 (&lt;5k)</option>
                                            <option value="RL.2">RL.2 (5k-15k)</option>
                                            <option value="RL.3">RL.3 (15k-50k)</option>
                                            <option value="RL.4">RL.4 (&gt;50k)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Row 2: Periods Consumption (Electricity Only) */}
                            {state.supplyType === 'electricity' && (
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
                            )}

                            {/* Row 3: Periods Power (Electricity Only) */}
                            {state.supplyType === 'electricity' && (
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
                            )}

                            {/* Row 4: Penalties & Mode (or Conversion Factor for Gas) */}
                            <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)' }}>
                                {state.supplyType === 'electricity' ? (
                                    <>
                                        <div key="elec-reactive">
                                            <label style={{ ...labelStyleCompact, minHeight: '1.5rem', display: 'flex', alignItems: 'end' }}>E. Reactiva (kVArh)</label>
                                            <input type="number" value={state.reactiveEnergy} onChange={e => updateState({ reactiveEnergy: e.target.value })} style={inputStyleCompact} />
                                        </div>
                                        <div key="elec-maxdemand">
                                            <label style={{ ...labelStyleCompact, minHeight: '1.5rem', display: 'flex', alignItems: 'end' }}>Max. Demanda (kW)</label>
                                            <input type="number" value={state.maxDemand} onChange={e => updateState({ maxDemand: e.target.value })} style={inputStyleCompact} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div key="gas-conversion">
                                            <label style={{ ...labelStyleCompact, minHeight: '1.5rem', display: 'flex', alignItems: 'end' }}>Factor de Conversión</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={state.conversionFactor}
                                                onChange={e => updateState({ conversionFactor: e.target.value })}
                                                placeholder="Ej. 11.70"
                                                style={inputStyleCompact}
                                            />
                                        </div>
                                        {/* Empty slot to align with electricity layout or merge */}
                                        <div></div>
                                    </>
                                )}

                                <div>
                                    <label style={{ ...labelStyleCompact, minHeight: '1.5rem', display: 'flex', alignItems: 'end' }}>Modo</label>
                                    <select
                                        value={state.mode}
                                        onChange={(e) => updateState({ mode: e.target.value as ComparisonMode })}
                                        style={inputStyleCompact}
                                    >
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
                                <div></div>
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
