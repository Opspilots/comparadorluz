import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { rankTariffs } from '../lib/rankTariffs'
import type { Customer, SupplyPoint, TariffVersion, ComparisonResult, ComparisonMode, ComparisonInput } from '@/shared/types'
import { ChevronDown, ChevronUp, Settings } from 'lucide-react'

export function ComparatorForm() {
    const [searching, setSearching] = useState(false)

    // Selection
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<string>('')
    const [supplyPoints, setSupplyPoints] = useState<SupplyPoint[]>([])
    const [selectedSP, setSelectedSP] = useState<string>('')

    // Inputs
    const [consumption, setConsumption] = useState('')
    const [power, setPower] = useState('')
    const [tariffType, setTariffType] = useState('2.0TD')
    const [mode, setMode] = useState<ComparisonMode>('client_first')

    // Advanced Inputs
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [reactiveEnergy, setReactiveEnergy] = useState('')
    const [maxDemand, setMaxDemand] = useState('')

    // Power by period (optional)
    const [powerP1, setPowerP1] = useState('')
    const [powerP2, setPowerP2] = useState('')
    const [powerP3, setPowerP3] = useState('')
    const [powerP4, setPowerP4] = useState('')
    const [powerP5, setPowerP5] = useState('')
    const [powerP6, setPowerP6] = useState('')

    // Consumption % by period (optional)
    const [consP1, setConsP1] = useState('')
    const [consP2, setConsP2] = useState('')
    const [consP3, setConsP3] = useState('')
    const [consP4, setConsP4] = useState('')
    const [consP5, setConsP5] = useState('')
    const [consP6, setConsP6] = useState('')

    // Results
    const [results, setResults] = useState<ComparisonResult[]>([])

    useEffect(() => {
        fetchCustomers()
    }, [])

    useEffect(() => {
        if (selectedCustomer) fetchSupplyPoints(selectedCustomer)
    }, [selectedCustomer])

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('*').order('name')
        setCustomers(data || [])
    }

    const fetchSupplyPoints = async (custId: string) => {
        const { data } = await supabase.from('supply_points').select('*').eq('customer_id', custId)
        setSupplyPoints(data || [])
    }

    const handleSPChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const spId = e.target.value
        setSelectedSP(spId)
        const sp = supplyPoints.find(p => p.id === spId)
        if (sp) {
            setConsumption(sp.annual_consumption_kwh?.toString() || '')
            setPower(sp.contracted_power_kw?.toString() || '')
            setTariffType(sp.tariff_type || '2.0TD')
        }
    }

    const handleCompare = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearching(true)

        try {
            // Prepare input object
            const inputData: ComparisonInput = {
                cif: 'MOCK',
                customer_type: 'empresa',
                annual_consumption_kwh: parseFloat(consumption),
                contracted_power_kw: parseFloat(power),
                tariff_type: tariffType,
                consumption_distribution: (consP1 || consP2) ? {
                    P1: parseFloat(consP1) || 0,
                    P2: parseFloat(consP2) || 0,
                    P3: parseFloat(consP3) || 0,
                    P4: parseFloat(consP4) || 0,
                    P5: parseFloat(consP5) || 0,
                    P6: parseFloat(consP6) || 0,
                } : undefined,
                reactive_energy_kvarh: parseFloat(reactiveEnergy) || 0,
                max_demand_kw: parseFloat(maxDemand) || 0,
                contracted_power_p1_kw: parseFloat(powerP1) || undefined,
                contracted_power_p2_kw: parseFloat(powerP2) || undefined,
                contracted_power_p3_kw: parseFloat(powerP3) || undefined,
                contracted_power_p4_kw: parseFloat(powerP4) || undefined,
                contracted_power_p5_kw: parseFloat(powerP5) || undefined,
                contracted_power_p6_kw: parseFloat(powerP6) || undefined,
            }

            // 1. Fetch ALL active tariffs of the given type
            // (For MVP we fetch all, in production we'd filter better)
            const { data: tariffs, error } = await supabase
                .from('tariff_versions')
                .select('*, components:tariff_components(*)')
                .eq('is_active', true)
                .eq('tariff_type', tariffType)

            if (error) throw error

            // 2. Rank them
            const rankedResults = rankTariffs(
                tariffs as TariffVersion[],
                tariffs as TariffVersion[],
                inputData,
                { mode }
            )

            setResults(rankedResults)
        } catch (err) {
            console.error(err)
            alert('Error en la comparativa')
        } finally {
            setSearching(false)
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <h1>Comparador de Tarifas</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Form Panel */}
                <section style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <form onSubmit={handleCompare} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Cliente (Opcional)</label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">-- Nuevo / Genérico --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {selectedCustomer && (
                            <div>
                                <label style={labelStyle}>Punto de Suministro</label>
                                <select value={selectedSP} onChange={handleSPChange} style={inputStyle}>
                                    <option value="">-- Personalizado --</option>
                                    {supplyPoints.map(p => <option key={p.id} value={p.id}>{p.cups || p.address}</option>)}
                                </select>
                            </div>
                        )}

                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Consumo Anual (kWh)</label>
                                <input
                                    type="number"
                                    value={consumption}
                                    onChange={(e) => setConsumption(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Potencia (kW)</label>
                                <input
                                    type="number"
                                    value={power}
                                    onChange={(e) => setPower(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Tipo de Tarifa</label>
                            <select value={tariffType} onChange={(e) => setTariffType(e.target.value)} style={inputStyle}>
                                <option value="2.0TD">2.0TD (Hogar/Negocio &lt; 15kW)</option>
                                <option value="3.0TD">3.0TD (Negocio &gt; 15kW)</option>
                            </select>
                        </div>



                        {/* ADVANCED TOGGLE */}
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                                    fontSize: '0.9rem', fontWeight: '500', padding: 0
                                }}
                            >
                                <Settings size={16} />
                                Configuración Avanzada (Periodos, Reactiva...)
                                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="animate-fade-in" style={{
                                display: 'grid', gap: '1rem',
                                background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #eee'
                            }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Consumo por Periodos (%)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    <input placeholder="P1 %" type="number" value={consP1} onChange={e => setConsP1(e.target.value)} style={inputStyle} />
                                    <input placeholder="P2 %" type="number" value={consP2} onChange={e => setConsP2(e.target.value)} style={inputStyle} />
                                    <input placeholder="P3 %" type="number" value={consP3} onChange={e => setConsP3(e.target.value)} style={inputStyle} />
                                    {tariffType !== '2.0TD' && (
                                        <>
                                            <input placeholder="P4 %" type="number" value={consP4} onChange={e => setConsP4(e.target.value)} style={inputStyle} />
                                            <input placeholder="P5 %" type="number" value={consP5} onChange={e => setConsP5(e.target.value)} style={inputStyle} />
                                            <input placeholder="P6 %" type="number" value={consP6} onChange={e => setConsP6(e.target.value)} style={inputStyle} />
                                        </>
                                    )}
                                </div>

                                <h4 style={{ margin: '0.5rem 0 0.5rem 0', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Potencias por Periodo (kW)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    <input placeholder="P1 kW" type="number" value={powerP1} onChange={e => setPowerP1(e.target.value)} style={inputStyle} />
                                    <input placeholder="P2 kW" type="number" value={powerP2} onChange={e => setPowerP2(e.target.value)} style={inputStyle} />
                                    {tariffType === '2.0TD' ? (
                                        <div /> // Filler
                                    ) : (
                                        <>
                                            <input placeholder="P3 kW" type="number" value={powerP3} onChange={e => setPowerP3(e.target.value)} style={inputStyle} />
                                            <input placeholder="P4 kW" type="number" value={powerP4} onChange={e => setPowerP4(e.target.value)} style={inputStyle} />
                                            <input placeholder="P5 kW" type="number" value={powerP5} onChange={e => setPowerP5(e.target.value)} style={inputStyle} />
                                            <input placeholder="P6 kW" type="number" value={powerP6} onChange={e => setPowerP6(e.target.value)} style={inputStyle} />
                                        </>
                                    )}
                                </div>

                                <h4 style={{ margin: '0.5rem 0 0.5rem 0', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Penalizaciones</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>E. Reactiva (kVArh)</label>
                                        <input type="number" value={reactiveEnergy} onChange={e => setReactiveEnergy(e.target.value)} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Max. Demanda (kW)</label>
                                        <input type="number" value={maxDemand} onChange={e => setMaxDemand(e.target.value)} style={inputStyle} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={labelStyle}>Modo de Comparativa</label>
                            <select value={mode} onChange={(e) => setMode(e.target.value as ComparisonMode)} style={inputStyle}>
                                <option value="client_first">💰 Ahorro Cliente (Precio más bajo)</option>
                                <option value="commercial_first">📈 Beneficio Comercial (Mayor comisión)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={searching}
                            style={{ padding: '1rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}
                        >
                            {searching ? 'Calculando...' : 'Obtener Comparativa'}
                        </button>
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
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Top {results.length} Ofertas Encontradas</h2>
                            {results.map((res, idx) => (
                                <div key={idx} style={{
                                    background: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    borderLeft: idx === 0 ? '6px solid #10b981' : '1px solid #eee'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{res.tariff_version?.supplier_name}</span>
                                            <h3 style={{ margin: '0.2rem 0' }}>{res.tariff_version?.tariff_name}</h3>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0070f3' }}>{Math.round(res.annual_cost_eur)}€</span>
                                            <span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>al año (IVA inc.)</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid #f0f0f0', paddingTop: '1rem' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Pago Mensual Estimado</span>
                                            <span style={{ fontWeight: 'bold' }}>{res.monthly_cost_eur}€</span>
                                        </div>
                                        {mode === 'commercial_first' && (
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
                                        <button style={{ marginLeft: 'auto', padding: '0.5rem 1rem', background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                                            Generar Propuesta
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: '500' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #ddd' }
