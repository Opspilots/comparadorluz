import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Trash2, Eye, Calendar, User } from 'lucide-react'
import type { ComparisonResult } from '@/shared/types'

interface SavedComparison {
    id: string
    name: string
    notes: string | null
    created_at: string
    customer_id: string | null
    results: ComparisonResult[]
    consumption_p1: number
    consumption_p2: number
    consumption_p3: number
    contracted_power_p1: number | null
    contracted_power_p2: number | null
    customer?: {
        name: string
    }
}

export function ComparisonHistory() {
    const [comparisons, setComparisons] = useState<SavedComparison[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedComparison, setSelectedComparison] = useState<SavedComparison | null>(null)

    useEffect(() => {
        fetchComparisons()
    }, [])

    const fetchComparisons = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('saved_comparisons')
            .select(`
                *,
                customer:customers(name)
            `)
            .order('created_at', { ascending: false })

        if (data) {
            setComparisons(data as any)
        }
        setLoading(false)
    }

    const deleteComparison = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta comparativa?')) return

        const { error } = await supabase
            .from('saved_comparisons')
            .delete()
            .eq('id', id)

        if (!error) {
            fetchComparisons()
            if (selectedComparison?.id === id) {
                setSelectedComparison(null)
            }
        }
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
    }

    return (
        <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
            {/* Lista de comparativas */}
            <div style={{ flex: '0 0 400px', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Comparativas Guardadas</h2>

                {comparisons.length === 0 ? (
                    <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No hay comparativas guardadas</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Las comparativas guardadas desde el Comparador aparecerán aquí
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {comparisons.map((comp) => (
                            <div
                                key={comp.id}
                                className="card"
                                style={{
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    border: selectedComparison?.id === comp.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => setSelectedComparison(comp)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                        {comp.name}
                                    </h3>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteComparison(comp.id)
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#999',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {comp.customer && (
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={14} />
                                        {comp.customer.name}
                                    </div>
                                )}

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={14} />
                                    {new Date(comp.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>

                                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {comp.results.length} tarifas comparadas
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detalles de la comparativa seleccionada */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {selectedComparison ? (
                    <div>
                        <h2 style={{ marginBottom: '1rem' }}>{selectedComparison.name}</h2>

                        {selectedComparison.notes && (
                            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#f8f9fa' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    Notas
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                                    {selectedComparison.notes}
                                </p>
                            </div>
                        )}

                        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Parámetros de Entrada</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Consumo P1
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{selectedComparison.consumption_p1} kWh</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Consumo P2
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{selectedComparison.consumption_p2} kWh</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        Consumo P3
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{selectedComparison.consumption_p3} kWh</div>
                                </div>
                                {selectedComparison.contracted_power_p1 && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            Potencia P1
                                        </div>
                                        <div style={{ fontWeight: 600 }}>{selectedComparison.contracted_power_p1} kW</div>
                                    </div>
                                )}
                                {selectedComparison.contracted_power_p2 && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            Potencia P2
                                        </div>
                                        <div style={{ fontWeight: 600 }}>{selectedComparison.contracted_power_p2} kW</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Resultados de Comparación</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {selectedComparison.results.map((result, index) => (
                                <div key={index} className="card" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                {result.tariff_version?.supplier_name || 'Sin Comercializadora'}
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                                                {result.tariff_version?.tariff_name}
                                            </h4>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Coste Anual
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                {Math.round(result.annual_cost_eur)}€
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ background: '#f0f9ff', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#0369a1' }}>
                                                Mensual
                                            </span>
                                            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>
                                                {result.monthly_cost_eur}€
                                            </span>
                                        </div>

                                        {result.annual_savings_eur && result.annual_savings_eur > 0 && (
                                            <div style={{ background: '#dcfce7', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#15803d' }}>
                                                    Ahorro
                                                </span>
                                                <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                                                    {Math.round(result.annual_savings_eur)}€/año
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Eye size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Selecciona una comparativa para ver los detalles</p>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
