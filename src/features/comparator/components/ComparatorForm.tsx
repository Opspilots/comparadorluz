import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { rankTariffs, groupResultsByTariff } from '../lib/rankTariffs'
import { useNavigate } from 'react-router-dom'
import type { TariffVersion, ComparisonResult, ComparisonMode, ComparisonInput, GroupedComparisonResult } from '@/shared/types'
import { useComparatorState } from '../hooks/useComparatorState'
import { InvoiceUploader } from './InvoiceUploader'
import { SaveComparisonDialog } from './SaveComparisonDialog'
import { useToast } from '@/hooks/use-toast'
import { GAS_CONSTANTS } from '@/shared/constants'
import { Zap, Flame, TrendingUp, Database } from 'lucide-react'

import { mapOcrData } from '../lib/ocrMapper'

export function ComparatorForm() {
    const navigate = useNavigate()
    const [searching, setSearching] = useState(false)

    // Use persistence hook
    const { state, updateState, clearState } = useComparatorState()

    const [results, setResults] = useState<ComparisonResult[]>([])
    const [groupedResults, setGroupedResults] = useState<GroupedComparisonResult[]>([])
    const [selectedDurations, setSelectedDurations] = useState<Record<string, number>>({})
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([])
    const [usedMarketPrices, setUsedMarketPrices] = useState(false)
    const [consumptionFromDatadis, setConsumptionFromDatadis] = useState(false)
    const { toast } = useToast()

    // Auto-fill consumption from Datadis when CUPS is entered
    useEffect(() => {
        const cups = state.cups?.trim()
        if (!cups || cups.length < 20) {
            setConsumptionFromDatadis(false)
            return
        }

        let cancelled = false
        const timer = setTimeout(async () => {
            try {
                const { data: consumption } = await supabase
                    .from('consumption_data')
                    .select('date, consumption_kwh')
                    .eq('cups', cups)
                    .order('date', { ascending: false })
                    .limit(365)

                if (cancelled || !consumption || consumption.length === 0) return

                // Calculate annual estimate: daily avg * 365
                const dailyTotals: Record<string, number> = {}
                for (const row of consumption) {
                    const key = row.date
                    dailyTotals[key] = (dailyTotals[key] || 0) + row.consumption_kwh
                }
                const days = Object.keys(dailyTotals)
                if (days.length === 0) return

                const totalKwh = Object.values(dailyTotals).reduce((a, b) => a + b, 0)
                const avgDaily = totalKwh / days.length
                const annualEstimate = Math.round(avgDaily * 365)

                if (!cancelled && annualEstimate > 0 && !state.consumption) {
                    updateState({ consumption: String(annualEstimate) })
                    setConsumptionFromDatadis(true)
                }
            } catch {
                // Silently ignore — no Datadis data available
            }
        }, 800)

        return () => { cancelled = true; clearTimeout(timer) }
    }, [state.cups, state.consumption, updateState])

    const fetchSuppliers = useCallback(async () => {
        const { data } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name')
        setSuppliers(data || [])
    }, [])

    useEffect(() => {
        fetchSuppliers()
    }, [fetchSuppliers])

    // Auto-select Gas Tariff based on consumption
    useEffect(() => {
        if (state.supplyType === 'gas' && state.consumption) {
            const consumptionValue = parseFloat(state.consumption)
            if (!isNaN(consumptionValue)) {
                let suggested = 'RL.4'
                if (consumptionValue <= GAS_CONSTANTS.THRESHOLDS.RL1) suggested = 'RL.1'
                else if (consumptionValue <= GAS_CONSTANTS.THRESHOLDS.RL2) suggested = 'RL.2'
                else if (consumptionValue <= GAS_CONSTANTS.THRESHOLDS.RL3) suggested = 'RL.3'

                if (state.tariffType !== suggested) {
                    updateState({ tariffType: suggested })
                }
            }
        }
    }, [state.consumption, state.supplyType, state.tariffType, updateState])

    const handleDataExtracted = (data: unknown) => {
        const updates = mapOcrData(data as Record<string, unknown>, suppliers);
        // Force update state with new data, this might need to clear previous values if we want a fresh start
        // But mapOcrData only returns found keys.
        // If we want to ensure tariff type updates even if state has one, updateState merges it.
        // The issue "fill fields but not change tariff type" suggests maybe the tariff type from OCR wasn't matching
        // the dropdown values, so it was ignored or set to something invalid?
        // Now that we normalized it in mapOcrData, it should work.
        updateState(updates);

        if (updates.cif) {
            checkExistingClientByCIF(updates.cif);
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
        setGroupedResults([]);
        setSelectedDurations({});
    }

    const checkExistingClientByCIF = async (cif: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
        if (!profile?.company_id) return

        const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('cif', cif)
            .eq('company_id', profile.company_id)
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

            const today = new Date().toISOString().split('T')[0]

            const { data: tariffs, error } = await supabase
                .from('tariff_versions')
                .select('*, tariff_rates(*)')
                .eq('is_active', true)
                .eq('tariff_type', inputState.tariffType)
                .lte('valid_from', today)
                .or(`valid_to.is.null,valid_to.gte.${today}`)
                .limit(100)

            if (error) throw error

            // Market prices for indexed tariff calculations (not available without integrations)
            const marketPrices: Array<{ indicator_id: number; price: number }> | undefined = undefined

            const results = rankTariffs(
                tariffs as TariffVersion[],
                inputData,
                {
                    mode: inputState.mode,
                    currentAnnualCostEur: inputState.currentCost ? parseFloat(inputState.currentCost) * 12 : undefined,
                    marketPrices,
                }
            )

            setResults(results)
            setUsedMarketPrices(false)

            // Group results by tariff for UI rendering
            const grouped = groupResultsByTariff(results)
            setGroupedResults(grouped)
            // Initialize selected durations to index 0 (shortest) for each group
            const initDurations: Record<string, number> = {}
            grouped.forEach(g => { initDurations[g.tariff_version_id] = 0 })
            setSelectedDurations(initDurations)

        } catch (e: unknown) {
            const error = e as Error;
            console.error(error)
            toast({ title: 'Error', description: 'Error en la comparativa. Verifica los datos.', variant: 'destructive' })
        } finally {
            setSearching(false)
        }
    }

    const handleClear = () => {
        clearState()
        setResults([])
        setGroupedResults([])
        setSelectedDurations({})
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="mobile-actions-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary tour-comparator-history-btn" onClick={() => navigate('/comparator/history')} style={{ fontSize: '0.9rem' }}>
                        Ver Historial
                    </button>
                    <button onClick={handleClear} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Limpiar formulario
                    </button>
                </div>
            </div>

            <div className="comparator-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Form Panel */}
                <section style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>

                    <div className="tour-comparator-uploader">
                        <InvoiceUploader
                            onDataExtracted={handleDataExtracted}
                            supplyType={state.supplyType}
                        />
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
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px', marginBottom: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => handleSupplyChange('electricity')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: state.supplyType === 'electricity' ? 'white' : 'transparent',
                                    color: state.supplyType === 'electricity' ? '#ca8a04' : '#64748b',
                                    boxShadow: state.supplyType === 'electricity' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Zap size={16} fill={state.supplyType === 'electricity' ? 'currentColor' : 'none'} /> Electricidad
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSupplyChange('gas')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: state.supplyType === 'gas' ? 'white' : 'transparent',
                                    color: state.supplyType === 'gas' ? '#ea580c' : '#64748b',
                                    boxShadow: state.supplyType === 'gas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Flame size={16} fill={state.supplyType === 'gas' ? 'currentColor' : 'none'} /> Gas
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
                                <label style={labelStyleCompact}>
                                    Consumo Anual (kWh)
                                    {consumptionFromDatadis && (
                                        <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#10b981', fontWeight: 500 }} title="Estimado desde datos reales de Datadis">
                                            <Database size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                                            Datadis
                                        </span>
                                    )}
                                </label>
                                <input type="number" value={state.consumption} onChange={e => { updateState({ consumption: e.target.value }); setConsumptionFromDatadis(false) }} required style={inputStyleCompact} />
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
                                            <option value="6.0">6.0</option>
                                            <option value="6.1TD">6.1TD</option>
                                            <option value="6.2TD">6.2TD</option>
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
                                    <div style={{ display: 'grid', gridTemplateColumns: state.tariffType === '2.0TD' ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: '0.4rem' }}>
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
                                    <div style={{ display: 'grid', gridTemplateColumns: state.tariffType === '2.0TD' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0.4rem' }}>
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
                            <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)' }}>
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
                                        <option value="commercial_first">Comisión</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={searching}
                                style={{
                                    gridColumn: 'span 12',
                                    padding: '0.7rem',
                                    background: state.supplyType === 'electricity' ? '#0f172a' : '#c2410c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    marginTop: '0.5rem',
                                    fontSize: '0.9rem',
                                    transition: 'background 0.2s',
                                    opacity: searching ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {state.supplyType === 'electricity'
                                    ? <Zap size={16} fill="currentColor" />
                                    : <Flame size={16} fill="currentColor" />
                                }
                                {searching ? 'Calculando...' : 'Obtener Comparativa'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Results Panel */}
                <section>
                    {groupedResults.length === 0 ? (
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

                            {groupedResults.map((group, idx) => {
                                const selIdx = selectedDurations[group.tariff_version_id] ?? 0;
                                const activeOption = group.duration_options[selIdx] || group.duration_options[0];
                                const res = activeOption.result;
                                const hasDurations = group.duration_options.length > 1;

                                return (
                                    <div key={group.tariff_version_id} style={{
                                        background: 'white',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        borderLeft: idx === 0 ? '6px solid #10b981' : '1px solid #eee',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{group.supplier_name || 'Unknown Supplier'}</span>
                                                <h3 style={{ margin: '0.2rem 0' }}>{group.tariff_name}</h3>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                    {group.tariff_version?.is_indexed && (
                                                        <>
                                                            <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '700', letterSpacing: '0.04em' }}>
                                                                INDEXADO
                                                            </span>
                                                            {usedMarketPrices && (
                                                                <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#065f46', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                                    <TrendingUp size={10} /> Precio pool real
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                    {group.tariff_version?.valid_from && (
                                                        <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                            Válida desde {new Date(group.tariff_version.valid_from).toLocaleDateString('es-ES')}
                                                            {group.tariff_version.valid_to && ` hasta ${new Date(group.tariff_version.valid_to).toLocaleDateString('es-ES')}`}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Duration Pills */}
                                                {hasDurations && (
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                        {group.duration_options.map((opt, optIdx) => (
                                                            <button
                                                                key={optIdx}
                                                                type="button"
                                                                onClick={() => setSelectedDurations(prev => ({ ...prev, [group.tariff_version_id]: optIdx }))}
                                                                style={{
                                                                    padding: '0.25rem 0.6rem',
                                                                    borderRadius: '999px',
                                                                    border: selIdx === optIdx ? '2px solid #7c3aed' : '1px solid #d1d5db',
                                                                    background: selIdx === optIdx ? '#f5f3ff' : '#fff',
                                                                    color: selIdx === optIdx ? '#7c3aed' : '#6b7280',
                                                                    fontWeight: selIdx === optIdx ? '600' : '400',
                                                                    fontSize: '0.78rem',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Single duration badge when no alternatives */}
                                                {!hasDurations && activeOption.duration && (
                                                    <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                                        {activeOption.label}
                                                    </span>
                                                )}

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
                                                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: state.supplyType === 'electricity' ? '#ca8a04' : '#ea580c' }}>{Math.round(res.annual_cost_eur)}€</span>
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
                                                    <span style={{ fontWeight: 'bold', color: '#92400e' }}>{(res.commission_eur || 0).toFixed(2)}€</span>
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
                                                            customerId: state.selectedCustomer || undefined,
                                                            customerName: state.customerName || undefined,
                                                            customerCif: state.cif || undefined,
                                                            tariffVersionId: res.tariff_version?.id,
                                                            cups: state.cups,
                                                            annualValue: Math.round(res.annual_cost_eur),
                                                            // Origin tariff: the client's CURRENT supplier/cost/tariff type
                                                            originSupplierName: state.currentSupplier || undefined,
                                                            originTariffName: state.tariffType || undefined,
                                                            originAnnualCost: state.currentCost ? Math.round(parseFloat(state.currentCost) * 12) : undefined,
                                                            commissionEur: res.commission_eur || 0,
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
