import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { DataRetentionPolicy, DataCategory } from '@/shared/types'
import {
    Save,
    Loader2,
    Info,
} from 'lucide-react'

const CATEGORY_INFO: Record<DataCategory, { label: string; description: string; defaultMonths: number; legalBasis: string }> = {
    customer_data: {
        label: 'Datos de clientes',
        description: 'CIF, nombre, direccion, contactos',
        defaultMonths: 60,
        legalBasis: 'Relacion contractual (Art. 6.1.b RGPD) + Obligaciones fiscales (4-6 anos)',
    },
    consumption_data: {
        label: 'Datos de consumo',
        description: 'Curvas horarias, CUPS, kWh — datos personales (STS)',
        defaultMonths: 36,
        legalBasis: 'Interes legitimo para comparaciones (Art. 6.1.f RGPD)',
    },
    contract_data: {
        label: 'Datos contractuales',
        description: 'Contratos, firmas, valores, comisiones',
        defaultMonths: 72,
        legalBasis: 'Obligacion legal tributaria (LGT Art. 66) + Codigo de Comercio (6 anos)',
    },
    comparison_data: {
        label: 'Comparaciones',
        description: 'Resultados de comparaciones, snapshots',
        defaultMonths: 24,
        legalBasis: 'Interes legitimo (Art. 6.1.f RGPD) — no necesario a largo plazo',
    },
    message_data: {
        label: 'Mensajes y comunicaciones',
        description: 'Emails, WhatsApp, campanas',
        defaultMonths: 36,
        legalBasis: 'Evidencia de consentimiento comercial (LSSI Art. 21)',
    },
    audit_logs: {
        label: 'Registros de auditoria',
        description: 'Acciones de usuarios, IPs, cambios',
        defaultMonths: 60,
        legalBasis: 'Seguridad y responsabilidad proactiva (Art. 5.2 RGPD)',
    },
}

interface Props {
    companyId: string
}

export function DataRetentionSettings({ companyId }: Props) {
    const { toast } = useToast()
    const [policies, setPolicies] = useState<DataRetentionPolicy[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editedMonths, setEditedMonths] = useState<Record<string, number>>({})
    const [editedAutoDelete, setEditedAutoDelete] = useState<Record<string, boolean>>({})

    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('data_retention_policies')
            .select('*')
            .eq('company_id', companyId)

        setPolicies((data || []) as DataRetentionPolicy[])
        setLoading(false)
    }, [companyId])

    useEffect(() => { load() }, [load])

    const getPolicy = (cat: DataCategory) => policies.find(p => p.data_category === cat)

    const handleSave = async () => {
        setSaving(true)
        try {
            const upserts = Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                const existing = getPolicy(cat as DataCategory)
                return {
                    id: existing?.id || undefined,
                    company_id: companyId,
                    data_category: cat,
                    retention_months: editedMonths[cat] ?? existing?.retention_months ?? info.defaultMonths,
                    legal_basis: info.legalBasis,
                    auto_delete: editedAutoDelete[cat] ?? existing?.auto_delete ?? false,
                    is_active: true,
                }
            })

            const { error } = await supabase
                .from('data_retention_policies')
                .upsert(upserts, { onConflict: 'company_id,data_category' })

            if (error) throw error
            toast({ title: 'Politicas de retencion guardadas' })
            setEditedMonths({})
            setEditedAutoDelete({})
            load()
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const hasChanges = Object.keys(editedMonths).length > 0 || Object.keys(editedAutoDelete).length > 0

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div>
    }

    return (
        <div>
            {/* Info banner */}
            <div style={{
                padding: '0.875rem 1rem', marginBottom: '1.25rem',
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            }}>
                <Info size={16} color="#2563eb" className="shrink-0" style={{ marginTop: 2 }} />
                <div style={{ fontSize: '0.8125rem', color: '#1e40af' }}>
                    <strong>RGPD Art. 5.1.e (Limitacion del plazo de conservacion):</strong> Los datos personales
                    solo pueden conservarse durante el tiempo necesario para los fines del tratamiento.
                    Configura los periodos de retencion por categoria y activa la eliminacion automatica
                    cuando corresponda.
                </div>
            </div>

            {/* Retention table */}
            <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ textAlign: 'left', padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Categoria
                            </th>
                            <th style={{ textAlign: 'left', padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Base Legal
                            </th>
                            <th style={{ textAlign: 'center', padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: 120 }}>
                                Retencion (meses)
                            </th>
                            <th style={{ textAlign: 'center', padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: 120 }}>
                                Auto-eliminar
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
                            const policy = getPolicy(cat as DataCategory)
                            const months = editedMonths[cat] ?? policy?.retention_months ?? info.defaultMonths
                            const autoDelete = editedAutoDelete[cat] ?? policy?.auto_delete ?? false

                            return (
                                <tr key={cat} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                            {info.label}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                                            {info.description}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div style={{ fontSize: '0.6875rem', color: '#64748b', maxWidth: 300 }}>
                                            {info.legalBasis}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            min={1}
                                            max={120}
                                            value={months}
                                            onChange={e => {
                                                const parsed = parseInt(e.target.value)
                                                const clamped = isNaN(parsed) ? info.defaultMonths : Math.max(1, Math.min(120, parsed))
                                                setEditedMonths(prev => ({ ...prev, [cat]: clamped }))
                                            }}
                                            style={{
                                                width: 70, padding: '0.375rem', textAlign: 'center',
                                                borderRadius: 6, border: '1px solid #e2e8f0',
                                                fontSize: '0.8125rem', fontWeight: 600,
                                            }}
                                        />
                                        <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: 2 }}>
                                            ({(months / 12).toFixed(1)} anos)
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={autoDelete}
                                                onChange={e => setEditedAutoDelete(prev => ({ ...prev, [cat]: e.target.checked }))}
                                                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: autoDelete ? '#2563eb' : '#94a3b8' }}>
                                                {autoDelete ? 'Si' : 'No'}
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1rem', borderRadius: 8,
                        background: hasChanges ? '#2563eb' : '#94a3b8',
                        color: '#fff', border: 'none',
                        fontSize: '0.8125rem', fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar Politicas de Retencion
                </button>
            </div>
        </div>
    )
}
