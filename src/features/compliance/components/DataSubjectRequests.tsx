import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { DataSubjectRequest, DataSubjectRequestType, DataSubjectRequestStatus, Customer } from '@/shared/types'
import {
    Shield,
    Plus,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

const REQUEST_TYPE_LABELS: Record<DataSubjectRequestType, string> = {
    access: 'Acceso',
    rectification: 'Rectificacion',
    erasure: 'Supresion',
    restriction: 'Limitacion',
    portability: 'Portabilidad',
    objection: 'Oposicion',
}

const STATUS_CONFIG: Record<DataSubjectRequestStatus, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
    in_progress: { label: 'En tramitacion', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
    completed: { label: 'Resuelta', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    rejected: { label: 'Denegada', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    extended: { label: 'Plazo ampliado', color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff' },
}

interface Props {
    companyId: string
}

export function DataSubjectRequests({ companyId }: Props) {
    const { toast } = useToast()
    const [requests, setRequests] = useState<DataSubjectRequest[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Form
    const [formType, setFormType] = useState<DataSubjectRequestType>('access')
    const [formName, setFormName] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formNif, setFormNif] = useState('')
    const [formCustomerId, setFormCustomerId] = useState('')
    const [formDescription, setFormDescription] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        const [requestsRes, customersRes] = await Promise.all([
            supabase
                .from('data_subject_requests')
                .select('*, customers(id, name, cif)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false }),
            supabase
                .from('customers')
                .select('id, name, cif')
                .eq('company_id', companyId)
                .order('name'),
        ])
        setRequests((requestsRes.data || []) as DataSubjectRequest[])
        setCustomers((customersRes.data || []) as Customer[])
        setLoading(false)
    }, [companyId])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!formName) return
        setSaving(true)
        try {
            const deadline = new Date()
            deadline.setMonth(deadline.getMonth() + 1) // 1 month legal deadline

            const { error } = await supabase
                .from('data_subject_requests')
                .insert({
                    company_id: companyId,
                    customer_id: formCustomerId || null,
                    request_type: formType,
                    requester_name: formName,
                    requester_email: formEmail || null,
                    requester_nif: formNif || null,
                    description: formDescription || null,
                    status: 'pending',
                    deadline_at: deadline.toISOString(),
                })

            if (error) throw error
            toast({ title: 'Solicitud ARCO+ registrada', description: `Plazo: ${deadline.toLocaleDateString('es-ES')}` })
            setShowAddForm(false)
            setFormName('')
            setFormEmail('')
            setFormNif('')
            setFormCustomerId('')
            setFormDescription('')
            load()
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const updateStatus = async (id: string, newStatus: DataSubjectRequestStatus, notes?: string) => {
        const updateData: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()
        if (newStatus === 'extended') {
            const ext = new Date()
            ext.setMonth(ext.getMonth() + 2)
            updateData.extended_deadline_at = ext.toISOString()
        }
        if (notes) updateData.response_notes = notes

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast({ title: 'Error', description: 'Sesión expirada. Por favor, recarga la página.', variant: 'destructive' })
            return
        }
        updateData.handled_by = user.id

        const { error } = await supabase
            .from('data_subject_requests')
            .update(updateData)
            .eq('id', id)

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: `Solicitud marcada como: ${STATUS_CONFIG[newStatus].label}` })
            load()
        }
    }

    const now = new Date()
    const overdue = requests.filter(r =>
        ['pending', 'in_progress'].includes(r.status) &&
        new Date(r.deadline_at) < now
    )

    return (
        <div>
            {/* Overdue warning */}
            {overdue.length > 0 && (
                <div style={{
                    padding: '0.875rem 1rem', marginBottom: '1rem',
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991b1b' }}>
                            {overdue.length} solicitud{overdue.length > 1 ? 'es' : ''} con plazo vencido
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#b91c1c', marginLeft: '0.5rem' }}>
                            — El RGPD exige respuesta en 1 mes (ampliable a 3). Incumplimiento = sancion AEPD.
                        </span>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} registrada{requests.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.875rem', borderRadius: 8,
                        background: '#2563eb', color: '#fff', border: 'none',
                        fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    <Plus size={14} /> Nueva Solicitud
                </button>
            </div>

            {/* Add form */}
            {showAddForm && (
                <div style={{
                    padding: '1.25rem', marginBottom: '1rem',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>
                        Registrar Solicitud de Derechos ARCO+
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Tipo de Derecho *
                            </label>
                            <select value={formType} onChange={e => setFormType(e.target.value as DataSubjectRequestType)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                                {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Cliente (si existe en el sistema)
                            </label>
                            <select value={formCustomerId} onChange={e => setFormCustomerId(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                                <option value="">Seleccionar...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.cif})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Nombre del Solicitante *
                            </label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                NIF del Solicitante
                            </label>
                            <input type="text" value={formNif} onChange={e => setFormNif(e.target.value.toUpperCase())}
                                placeholder="12345678A"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem', fontFamily: 'monospace' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Email del Solicitante
                            </label>
                            <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                            Descripcion de la solicitud
                        </label>
                        <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem', resize: 'vertical' }} />
                    </div>
                    <div style={{
                        marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6,
                        fontSize: '0.75rem', color: '#1e40af',
                    }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Plazo legal: 1 mes desde la recepcion (RGPD Art. 12.3). Ampliable 2 meses si es compleja.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                        <button onClick={() => setShowAddForm(false)}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button onClick={handleCreate} disabled={!formName || saving}
                            style={{
                                padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none',
                                background: '#2563eb', color: '#fff', fontSize: '0.8125rem',
                                fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: !formName || saving ? 0.6 : 1,
                            }}>
                            {saving ? <Loader2 size={13} className="animate-spin" /> : 'Registrar Solicitud'}
                        </button>
                    </div>
                </div>
            )}

            {/* Requests list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div>
            ) : requests.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: '#94a3b8',
                    background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                }}>
                    <Shield size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.875rem' }}>No hay solicitudes ARCO+ registradas</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {requests.map(req => {
                        const config = STATUS_CONFIG[req.status]
                        const isExpanded = expandedId === req.id
                        const isOverdue = ['pending', 'in_progress'].includes(req.status) && new Date(req.deadline_at) < now

                        return (
                            <div
                                key={req.id}
                                style={{
                                    borderRadius: 10, overflow: 'hidden',
                                    background: '#fff',
                                    border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem 1rem', cursor: 'pointer',
                                    }}
                                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 6,
                                            background: config.bg, color: config.color,
                                            fontSize: '0.6875rem', fontWeight: 700,
                                            border: `1px solid ${config.border}`,
                                        }}>
                                            {config.label}
                                        </span>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: 4,
                                            background: '#f1f5f9', color: '#475569',
                                            fontSize: '0.6875rem', fontWeight: 600,
                                        }}>
                                            {REQUEST_TYPE_LABELS[req.request_type]}
                                        </span>
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                            {req.requester_name}
                                        </span>
                                        {req.requester_nif && (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                {req.requester_nif}
                                            </span>
                                        )}
                                        {isOverdue && (
                                            <span style={{
                                                padding: '1px 6px', borderRadius: 4,
                                                background: '#dc2626', color: '#fff',
                                                fontSize: '0.625rem', fontWeight: 700,
                                            }}>
                                                VENCIDA
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            Limite: {new Date(req.deadline_at).toLocaleDateString('es-ES')}
                                        </span>
                                        {isExpanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9',
                                        background: '#fafbfc',
                                    }}>
                                        {req.description && (
                                            <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.75rem' }}>
                                                {req.description}
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                            <div>Recibida: {new Date(req.created_at).toLocaleDateString('es-ES')}</div>
                                            <div>Email: {req.requester_email || '—'}</div>
                                            {req.completed_at && <div>Resuelta: {new Date(req.completed_at).toLocaleDateString('es-ES')}</div>}
                                        </div>
                                        {req.response_notes && (
                                            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem', padding: '0.5rem', background: '#fff', borderRadius: 6, border: '1px dashed #e2e8f0' }}>
                                                <strong>Respuesta:</strong> {req.response_notes}
                                            </div>
                                        )}
                                        {/* Action buttons */}
                                        {!['completed', 'rejected'].includes(req.status) && (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                {req.status === 'pending' && (
                                                    <button onClick={() => updateStatus(req.id, 'in_progress')}
                                                        style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                                        Iniciar Tramitacion
                                                    </button>
                                                )}
                                                <button onClick={() => updateStatus(req.id, 'extended')}
                                                    style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                                    Ampliar Plazo (+2 meses)
                                                </button>
                                                <button onClick={() => updateStatus(req.id, 'completed')}
                                                    style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: '#15803d', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                                    <CheckCircle2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                                                    Marcar Resuelta
                                                </button>
                                                <button onClick={() => updateStatus(req.id, 'rejected')}
                                                    style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                                    Denegar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
