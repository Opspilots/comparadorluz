import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { recordAuditLog } from '@/shared/lib/audit'
import type { TariffBatch, TariffVersion } from '@/shared/types'

export function TariffBatchReview() {
    const [loading, setLoading] = useState(true)
    const [batches, setBatches] = useState<TariffBatch[]>([])
    const [selectedBatch, setSelectedBatch] = useState<TariffBatch | null>(null)
    const [versions, setVersions] = useState<TariffVersion[]>([])
    const [publishing, setPublishing] = useState(false)

    useEffect(() => {
        fetchPendingBatches()
    }, [])

    const fetchPendingBatches = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('tariff_batches')
            .select('*')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false })

        if (error) console.error(error)
        else setBatches(data || [])
        setLoading(false)
    }

    const fetchBatchDetails = async (batchId: string) => {
        const { data, error } = await supabase
            .from('tariff_versions')
            .select('*, components:tariff_components(*)')
            .eq('batch_id', batchId)

        if (error) console.error(error)
        else setVersions(data || [])
    }

    const handleSelectBatch = (batch: TariffBatch) => {
        setSelectedBatch(batch)
        fetchBatchDetails(batch.id)
    }

    const handlePublish = async () => {
        if (!selectedBatch) return
        setPublishing(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            // Workflow:
            // 1. Mark batch as published
            // 2. Mark versions as active
            // 3. Set valid_to on previous active versions of the same supplier/tariff (simplified for MVP)

            const { error: batchError } = await supabase
                .from('tariff_batches')
                .update({
                    status: 'published',
                    published_by: user.id,
                    published_at: new Date().toISOString()
                })
                .eq('id', selectedBatch.id)

            if (batchError) throw batchError

            const { error: versionError } = await supabase
                .from('tariff_versions')
                .update({ is_active: true })
                .eq('batch_id', selectedBatch.id)

            if (versionError) throw versionError

            await recordAuditLog({
                action: 'tariff.publish',
                entity_type: 'tariff_batch',
                entity_id: selectedBatch.id,
                metadata: { batch_id: selectedBatch.id }
            })

            setSelectedBatch(null)
            fetchPendingBatches()
        } catch (err) {
            console.error(err)
            alert('Error publishing batch')
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Cargando lotes pendientes...</div>

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Revisión de Tarifas</h1>

            {!selectedBatch ? (
                <section>
                    <h3>Lotes Pendientes de Revisión ({batches.length})</h3>
                    {batches.length === 0 ? (
                        <p>No hay lotes pendientes.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {batches.map(batch => (
                                <div key={batch.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>
                                    <p><strong>ID Lote:</strong> {batch.id}</p>
                                    <p><strong>Fecha subida:</strong> {new Date(batch.created_at).toLocaleString()}</p>
                                    <button onClick={() => handleSelectBatch(batch)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                                        Revisar Contenido
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section>
                    <button onClick={() => setSelectedBatch(null)} style={{ marginBottom: '1rem' }}>← Volver al listado</button>
                    <div style={{ padding: '1.5rem', background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h2>Revisando Lote: {selectedBatch.id}</h2>
                                <p>Nº de Versiones: {versions.length}</p>
                            </div>
                            <button
                                onClick={handlePublish}
                                disabled={publishing}
                                style={{ padding: '0.8rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {publishing ? 'Publicando...' : 'Aprobar y Publicar Todo'}
                            </button>
                        </header>

                        <div style={{ display: 'grid', gap: '2rem' }}>
                            {versions.map(v => (
                                <div key={v.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
                                    <h3>{v.supplier_name} - {v.tariff_name} ({v.tariff_type})</h3>
                                    <p>Válida desde: {v.valid_from}</p>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                                <th style={{ padding: '0.5rem' }}>Componente</th>
                                                <th style={{ padding: '0.5rem' }}>Período</th>
                                                <th style={{ padding: '0.5rem' }}>Precio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {v.components?.map(c => (
                                                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '0.5rem' }}>{c.component_type}</td>
                                                    <td style={{ padding: '0.5rem' }}>{c.period || '-'}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {c.price_eur_kwh !== null ? `${c.price_eur_kwh} EUR/kWh` :
                                                            c.price_eur_kw_year !== null ? `${c.price_eur_kw_year} EUR/kW/año` :
                                                                c.fixed_price_eur_month !== null ? `${c.fixed_price_eur_month} EUR/mes` : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
