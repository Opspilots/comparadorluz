import React, { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { recordAuditLog } from '@/shared/lib/audit'
import type { ComponentType } from '@/shared/types'

interface TariffComponentForm {
    type: ComponentType
    period?: string
    price_eur_kwh?: string
    price_eur_kw_year?: string
    fixed_price_eur_month?: string
}

export function TariffBatchUpload() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form State
    const [supplierName, setSupplierName] = useState('')
    const [tariffName, setTariffName] = useState('')
    const [tariffType, setTariffType] = useState('2.0TD')
    const [validFrom, setValidFrom] = useState('')
    const [pdfFile, setPdfFile] = useState<File | null>(null)

    // Components State
    const [components, setComponents] = useState<TariffComponentForm[]>([
        { type: 'energy_price', period: 'P1', price_eur_kwh: '' },
        { type: 'energy_price', period: 'P2', price_eur_kwh: '' },
        { type: 'power_price', period: 'P1', price_eur_kw_year: '' },
        { type: 'power_price', period: 'P2', price_eur_kw_year: '' },
        { type: 'fixed_fee', fixed_price_eur_month: '' },
    ])

    const handleComponentChange = (index: number, field: keyof TariffComponentForm, value: string) => {
        const newComponents = [...components]
        newComponents[index] = { ...newComponents[index], [field]: value }
        setComponents(newComponents)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Debes estar autenticado para subir tarifas.')

            // 1. Get current user/company (simulation for MVP)
            // Fetch correct company_id from users table
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (profileError) throw new Error('No se pudo determinar la empresa asociada a tu cuenta.')
            const companyId = profile.company_id

            // 2. Upload PDF to Storage (if any)
            let storagePath = ''
            if (pdfFile) {
                const fileExt = pdfFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('tariff-pdfs')
                    .upload(`${companyId}/${fileName}`, pdfFile)

                if (uploadError) throw uploadError
                storagePath = uploadData.path
            }

            // 3. Create Batch
            const { data: batch, error: batchError } = await supabase
                .from('tariff_batches')
                .insert({
                    company_id: companyId,
                    uploaded_by: user.id,
                    status: 'pending_review',
                    file_count: 1,
                })
                .select()
                .single()

            if (batchError) throw batchError

            // 4. Create File Record
            const { data: fileRecord, error: fileError } = await supabase
                .from('tariff_files')
                .insert({
                    company_id: companyId,
                    batch_id: batch.id,
                    filename: pdfFile?.name || 'Manual entry',
                    storage_path: storagePath,
                    extraction_status: 'completed',
                })
                .select()
                .single()

            if (fileError) throw fileError

            // 5. Create Tariff Version
            const { data: version, error: versionError } = await supabase
                .from('tariff_versions')
                .insert({
                    company_id: companyId,
                    batch_id: batch.id,
                    file_id: fileRecord.id,
                    supplier_name: supplierName,
                    tariff_name: tariffName,
                    tariff_type: tariffType,
                    valid_from: validFrom,
                    is_active: false, // Inactive until published
                })
                .select()
                .single()

            if (versionError) throw versionError

            // 6. Create Components
            const finalComponents = components
                .filter(c => c.price_eur_kwh || c.price_eur_kw_year || c.fixed_price_eur_month)
                .map(c => ({
                    company_id: companyId,
                    tariff_version_id: version.id,
                    component_type: c.type,
                    period: c.period,
                    price_eur_kwh: c.price_eur_kwh ? parseFloat(c.price_eur_kwh) : null,
                    price_eur_kw_year: c.price_eur_kw_year ? parseFloat(c.price_eur_kw_year) : null,
                    fixed_price_eur_month: c.fixed_price_eur_month ? parseFloat(c.fixed_price_eur_month) : null,
                }))

            const { error: compsError } = await supabase
                .from('tariff_components')
                .insert(finalComponents)

            if (compsError) throw compsError

            // 7. Audit Log
            await recordAuditLog({
                action: 'tariff.upload',
                entity_type: 'tariff_batch',
                entity_id: batch.id,
                metadata: { supplier_name: supplierName, tariff_name: tariffName }
            })

            setSuccess(true)
            // Reset form
            setSupplierName('')
            setTariffName('')
            setPdfFile(null)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al subir la tarifa')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <h1>Subir Nueva Tarifa</h1>
            <p>Introduce los datos manualmente basándote en el PDF de la comercializadora.</p>

            {success && (
                <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    ✅ Tarifa subida con éxito. Pendiente de revisión.
                </div>
            )}

            {error && (
                <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    ❌ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Comercializadora</label>
                        <input
                            type="text"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            required
                            placeholder="Ej: Endesa, Iberdrola..."
                            style={{ width: '100%', padding: '0.5rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre de la Tarifa</label>
                        <input
                            type="text"
                            value={tariffName}
                            onChange={(e) => setTariffName(e.target.value)}
                            required
                            placeholder="Ej: One Luz 3 períodos"
                            style={{ width: '100%', padding: '0.5rem' }}
                        />
                    </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Tarifa</label>
                        <select
                            value={tariffType}
                            onChange={(e) => setTariffType(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem' }}
                        >
                            <option value="2.0TD">2.0TD (Hasta 15kW)</option>
                            <option value="3.0TD">3.0TD (Más de 15kW)</option>
                            <option value="6.1TD">6.1TD (Alta Tensión)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Válida desde</label>
                        <input
                            type="date"
                            value={validFrom}
                            onChange={(e) => setValidFrom(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem' }}
                        />
                    </div>
                </section>

                <section>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>PDF de Referencia (Opcional)</label>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </section>

                <hr style={{ margin: '1rem 0' }} />

                <h3>Precios y Componentes</h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {components.map((comp, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9f9f9', padding: '0.5rem' }}>
                            <span style={{ minWidth: '150px', fontWeight: 'bold' }}>
                                {comp.type === 'energy_price' ? `Energía ${comp.period}` :
                                    comp.type === 'power_price' ? `Potencia ${comp.period}` :
                                        'Cargo Fijo'}
                            </span>

                            {comp.type === 'energy_price' && (
                                <input
                                    type="number"
                                    step="0.000001"
                                    placeholder="Precio EUR/kWh"
                                    value={comp.price_eur_kwh}
                                    onChange={(e) => handleComponentChange(idx, 'price_eur_kwh', e.target.value)}
                                    style={{ padding: '0.4rem' }}
                                />
                            )}

                            {comp.type === 'power_price' && (
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Precio EUR/kW/año"
                                    value={comp.price_eur_kw_year}
                                    onChange={(e) => handleComponentChange(idx, 'price_eur_kw_year', e.target.value)}
                                    style={{ padding: '0.4rem' }}
                                />
                            )}

                            {comp.type === 'fixed_fee' && (
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Precio EUR/mes"
                                    value={comp.fixed_price_eur_month}
                                    onChange={(e) => handleComponentChange(idx, 'fixed_price_eur_month', e.target.value)}
                                    style={{ padding: '0.4rem' }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    {loading ? 'Subiendo...' : 'Crear Batch y Enviar a Revisión'}
                </button>
            </form>
        </div>
    )
}
