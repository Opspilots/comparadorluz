import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { AgentCertification, CertificationType } from '@/shared/types'
import {
    GraduationCap,
    Plus,
    Check,
    AlertTriangle,
    Loader2,
    Calendar,
    Award,
    Trash2,
} from 'lucide-react'

const CERT_TYPE_LABELS: Record<CertificationType, { label: string; required: boolean }> = {
    cnmc_commercial_practices: { label: 'Practicas Comerciales CNMC', required: true },
    data_protection: { label: 'Proteccion de Datos (RGPD/LOPD)', required: true },
    energy_market: { label: 'Mercado Energetico Espanol', required: true },
    switching_procedures: { label: 'Procedimientos de Cambio (ATR)', required: true },
    consumer_rights: { label: 'Derechos del Consumidor', required: true },
    product_knowledge: { label: 'Conocimiento de Productos/Tarifas', required: false },
    custom: { label: 'Formacion Personalizada', required: false },
}

const REQUIRED_CERTS: CertificationType[] = [
    'cnmc_commercial_practices',
    'data_protection',
    'energy_market',
    'switching_procedures',
    'consumer_rights',
]

interface Props {
    commissionerId: string
}

export function AgentTrainingTab({ commissionerId }: Props) {
    const { toast } = useToast()
    const [certs, setCerts] = useState<AgentCertification[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [saving, setSaving] = useState(false)
    const [companyId, setCompanyId] = useState('')

    // Form
    const [formType, setFormType] = useState<CertificationType>('cnmc_commercial_practices')
    const [formTitle, setFormTitle] = useState('')
    const [formIssuedAt, setFormIssuedAt] = useState(new Date().toISOString().split('T')[0])
    const [formExpiresAt, setFormExpiresAt] = useState('')
    const [formIssuer, setFormIssuer] = useState('')
    const [formScore, setFormScore] = useState('')

    useEffect(() => {
        supabase.rpc('get_auth_company_id').then(({ data }) => {
            if (data) setCompanyId(data as string)
        })
    }, [])

    const load = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('agent_certifications')
            .select('*')
            .eq('commissioner_id', commissionerId)
            .order('issued_at', { ascending: false })

        setCerts((data || []) as AgentCertification[])
        setLoading(false)
    }

    useEffect(() => { load() }, [commissionerId])

    // Check compliance
    const activeCerts = certs.filter(c => c.status === 'active')
    const activeCertTypes = new Set(activeCerts.map(c => c.certification_type))
    const missingRequired = REQUIRED_CERTS.filter(t => !activeCertTypes.has(t))
    const isCompliant = missingRequired.length === 0
    const expiringCerts = activeCerts.filter(c => {
        if (!c.expires_at) return false
        const days = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return days <= 30 && days > 0
    })

    // Update commissioner compliance status
    useEffect(() => {
        if (companyId) {
            supabase
                .from('commissioners')
                .update({
                    training_compliant: isCompliant,
                    training_checked_at: new Date().toISOString(),
                })
                .eq('id', commissionerId)
                .then(() => { /* best-effort */ })
        }
    }, [isCompliant, commissionerId, companyId])

    const handleAdd = async () => {
        if (!formTitle || !companyId) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('agent_certifications')
                .insert({
                    company_id: companyId,
                    commissioner_id: commissionerId,
                    certification_type: formType,
                    title: formTitle,
                    issued_at: formIssuedAt,
                    expires_at: formExpiresAt || null,
                    issuer: formIssuer || null,
                    score: formScore ? parseInt(formScore) : null,
                    status: 'active',
                })

            if (error) throw error
            toast({ title: 'Certificacion registrada' })
            setShowAdd(false)
            setFormTitle('')
            setFormIssuer('')
            setFormScore('')
            setFormExpiresAt('')
            load()
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('agent_certifications')
            .delete()
            .eq('id', id)
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Certificacion eliminada' })
            load()
        }
    }

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div>
    }

    return (
        <div>
            {/* Compliance status */}
            <div style={{
                padding: '1rem 1.25rem', marginBottom: '1.25rem',
                borderRadius: 12,
                background: isCompliant ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isCompliant ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isCompliant
                        ? <Check size={18} color="#15803d" />
                        : <AlertTriangle size={18} color="#dc2626" />
                    }
                    <div>
                        <div style={{
                            fontSize: '0.875rem', fontWeight: 600,
                            color: isCompliant ? '#14532d' : '#991b1b',
                        }}>
                            {isCompliant ? 'Agente certificado — cumple requisitos CNMC' : 'Formacion incompleta'}
                        </div>
                        {!isCompliant && (
                            <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: 2 }}>
                                Faltan {missingRequired.length} certificacion{missingRequired.length > 1 ? 'es' : ''} obligatoria{missingRequired.length > 1 ? 's' : ''}:
                                {' '}{missingRequired.map(t => CERT_TYPE_LABELS[t].label).join(', ')}
                            </div>
                        )}
                    </div>
                </div>
                <span style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: isCompliant ? '#15803d' : '#dc2626',
                    color: '#fff', fontSize: '0.6875rem', fontWeight: 700,
                }}>
                    {isCompliant ? 'COMPLIANT' : 'NO COMPLIANT'}
                </span>
            </div>

            {/* Expiring soon */}
            {expiringCerts.length > 0 && (
                <div style={{
                    padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10,
                    fontSize: '0.8125rem', color: '#92400e',
                }}>
                    <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    <strong>{expiringCerts.length}</strong> certificacion{expiringCerts.length > 1 ? 'es' : ''} caduca{expiringCerts.length > 1 ? 'n' : ''} en menos de 30 dias
                </div>
            )}

            {/* Required certs checklist */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.5rem', marginBottom: '1.25rem',
            }}>
                {REQUIRED_CERTS.map(type => {
                    const has = activeCertTypes.has(type)
                    const info = CERT_TYPE_LABELS[type]
                    return (
                        <div key={type} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 0.75rem', borderRadius: 8,
                            background: has ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${has ? '#bbf7d0' : '#fecaca'}`,
                        }}>
                            {has
                                ? <Check size={13} color="#15803d" />
                                : <AlertTriangle size={13} color="#dc2626" />
                            }
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 500,
                                color: has ? '#14532d' : '#991b1b',
                            }}>
                                {info.label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {certs.length} certificacion{certs.length !== 1 ? 'es' : ''} registrada{certs.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '0.4rem 0.75rem', borderRadius: 8,
                        background: '#2563eb', color: '#fff', border: 'none',
                        fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    <Plus size={14} /> Anadir Certificacion
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div style={{
                    padding: '1.25rem', marginBottom: '1rem',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Tipo *
                            </label>
                            <select value={formType} onChange={e => setFormType(e.target.value as CertificationType)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                                {Object.entries(CERT_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}{v.required ? ' (obligatorio)' : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Titulo *
                            </label>
                            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                                placeholder="Ej: Curso de practicas comerciales"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Fecha de emision *
                            </label>
                            <input type="date" value={formIssuedAt} onChange={e => setFormIssuedAt(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Fecha de caducidad
                            </label>
                            <input type="date" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Entidad emisora
                            </label>
                            <input type="text" value={formIssuer} onChange={e => setFormIssuer(e.target.value)}
                                placeholder="Ej: CNMC, empresa interna"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Puntuacion (0-100)
                            </label>
                            <input type="number" min="0" max="100" value={formScore} onChange={e => setFormScore(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                        <button onClick={() => setShowAdd(false)}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button onClick={handleAdd} disabled={!formTitle || saving}
                            style={{
                                padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none',
                                background: '#2563eb', color: '#fff', fontSize: '0.8125rem',
                                fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: !formTitle || saving ? 0.6 : 1,
                            }}>
                            {saving ? <Loader2 size={13} className="animate-spin" /> : 'Registrar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Certs list */}
            {certs.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: '#94a3b8',
                    background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                }}>
                    <GraduationCap size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '0.875rem' }}>Sin certificaciones registradas</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Registra las formaciones del agente para cumplir con los requisitos CNMC
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {certs.map(cert => {
                        const typeInfo = CERT_TYPE_LABELS[cert.certification_type]
                        const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date()
                        const isExpiring = cert.expires_at && !isExpired &&
                            Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30

                        return (
                            <div key={cert.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem 1rem', borderRadius: 10,
                                background: '#fff',
                                border: `1px solid ${isExpired ? '#fecaca' : isExpiring ? '#fef08a' : '#e2e8f0'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 8,
                                        background: isExpired ? '#fee2e2' : '#dbeafe',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Award size={14} color={isExpired ? '#dc2626' : '#2563eb'} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                            {cert.title}
                                            {typeInfo?.required && (
                                                <span style={{
                                                    marginLeft: 6, fontSize: '0.5625rem', fontWeight: 700,
                                                    background: '#dbeafe', color: '#1e40af', padding: '1px 4px',
                                                    borderRadius: 3,
                                                }}>
                                                    OBLIGATORIO
                                                </span>
                                            )}
                                            {isExpired && (
                                                <span style={{
                                                    marginLeft: 6, fontSize: '0.5625rem', fontWeight: 700,
                                                    background: '#dc2626', color: '#fff', padding: '1px 4px',
                                                    borderRadius: 3,
                                                }}>
                                                    CADUCADO
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                            {typeInfo?.label || cert.certification_type}
                                            {cert.issuer && ` — ${cert.issuer}`}
                                            {cert.score !== null && cert.score !== undefined && ` · ${cert.score}/100`}
                                            {' · '}Emitido: {new Date(cert.issued_at).toLocaleDateString('es-ES')}
                                            {cert.expires_at && ` · Caduca: ${new Date(cert.expires_at).toLocaleDateString('es-ES')}`}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(cert.id)}
                                    style={{
                                        padding: '0.25rem', borderRadius: 4,
                                        border: 'none', background: 'transparent',
                                        color: '#94a3b8', cursor: 'pointer',
                                    }}
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
