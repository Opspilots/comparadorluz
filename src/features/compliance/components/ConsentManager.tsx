import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/shared/lib/errors'
import type { CustomerConsent, ConsentType, ConsentRequest, Customer } from '@/shared/types'
import { sendConsentRequest, getAvailableChannels, CONSENT_LEGAL_TEXTS } from '../lib/consent-notification'
import { useNavigate } from 'react-router-dom'
import {
    Search,
    Check,
    X,
    AlertTriangle,
    Loader2,
    Send,
    Mail,
    MessageCircle,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    FileSignature,
    ChevronDown,
    ChevronUp,
    Settings,
} from 'lucide-react'

const CONSENT_LABELS: Record<ConsentType, { label: string; description: string; required: boolean }> = {
    data_processing: { label: 'Tratamiento de datos', description: 'Consentimiento para tratar datos personales (RGPD Art. 6)', required: true },
    commercial_contact: { label: 'Contacto comercial', description: 'Permiso para realizar llamadas/contacto comercial (RD 88/2026)', required: true },
    switching_authorization: { label: 'Autorización de cambio', description: 'Consentimiento para tramitar cambio de comercializador (CNMC)', required: true },
    data_sharing: { label: 'Cesión a terceros', description: 'Permiso para compartir datos con comercializadoras (RGPD Art. 6.1.a)', required: false },
    marketing: { label: 'Comunicaciones comerciales', description: 'Envío de ofertas y campañas por email/WhatsApp (LSSI Art. 21)', required: false },
}

const REQUEST_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Check }> = {
    sent: { label: 'Enviada', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', icon: Send },
    viewed: { label: 'Vista', color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff', icon: Eye },
    signed: { label: 'Firmada', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: CheckCircle2 },
    expired: { label: 'Expirada', color: '#b45309', bg: '#fef3c7', border: '#fde68a', icon: Clock },
    rejected: { label: 'Rechazada', color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: XCircle },
}

interface Props {
    companyId: string
}

type ViewMode = 'consents' | 'requests'

export function ConsentManager({ companyId }: Props) {
    const { toast } = useToast()
    const navigate = useNavigate()
    const [consents, setConsents] = useState<(CustomerConsent & { customers?: Customer })[]>([])
    const [requests, setRequests] = useState<(ConsentRequest & { customers?: Customer })[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('consents')

    // Send request form state
    const [showSendForm, setShowSendForm] = useState(false)
    const [bulkMode, setBulkMode] = useState(false)
    const [sendCustomerId, setSendCustomerId] = useState('')
    const [sendConsentTypes, setSendConsentTypes] = useState<Set<ConsentType>>(new Set(['data_processing', 'commercial_contact', 'switching_authorization']))
    const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email')
    const [sending, setSending] = useState(false)
    const [availableChannels, setAvailableChannels] = useState<{ email: boolean; whatsapp: boolean }>({ email: false, whatsapp: false })
    const [showLegalPreview, setShowLegalPreview] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [consentsRes, requestsRes, customersRes, companyRes] = await Promise.all([
                supabase
                    .from('customer_consents')
                    .select('*, customers(id, name, cif)')
                    .eq('company_id', companyId)
                    .is('revoked_at', null)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('consent_requests')
                    .select('*, customers(id, name, cif)')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('customers')
                    .select('id, name, cif')
                    .eq('company_id', companyId)
                    .order('name'),
                supabase
                    .from('companies')
                    .select('messaging_settings')
                    .eq('id', companyId)
                    .single(),
            ])
            setConsents((consentsRes.data || []) as (CustomerConsent & { customers?: Customer })[])
            setRequests((requestsRes.data || []) as (ConsentRequest & { customers?: Customer })[])
            setCustomers((customersRes.data || []) as Customer[])
            setAvailableChannels(getAvailableChannels(
                (companyRes.data?.messaging_settings as Record<string, unknown>) || null
            ))
        } catch (err) {
            console.error('Error loading consent data:', err)
            toast({ title: 'Error', description: 'No se pudieron cargar los datos de consentimiento.', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }, [companyId, toast])

    useEffect(() => { load() }, [load])

    // ── Revoke (GDPR Art. 7.3 — must cascade to open consent requests) ──
    const handleRevoke = async (consentId: string) => {
        // Get consent details to find the customer and type
        const consent = consents.find(c => c.id === consentId)
        if (!consent) return

        const { error } = await supabase
            .from('customer_consents')
            .update({ revoked_at: new Date().toISOString(), granted: false })
            .eq('id', consentId)

        if (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
            return
        }

        // Cancel any open consent requests for this customer that include the revoked consent type
        const openRequests = requests.filter(r =>
            r.customer_id === consent.customer_id &&
            ['sent', 'viewed'].includes(r.status) &&
            r.consent_types.includes(consent.consent_type)
        )

        for (const req of openRequests) {
            await supabase
                .from('consent_requests')
                .update({ status: 'rejected' })
                .eq('id', req.id)
        }

        toast({ title: 'Consentimiento revocado', description: openRequests.length > 0 ? `${openRequests.length} solicitud(es) pendiente(s) cancelada(s)` : undefined })
        load()
    }

    // ── Send consent request ──
    const handleSendRequest = async () => {
        if (!sendCustomerId || sendConsentTypes.size === 0) return
        setSending(true)
        try {
            const result = await sendConsentRequest({
                companyId,
                customerId: sendCustomerId,
                consentTypes: Array.from(sendConsentTypes),
                channel: sendChannel,
            })

            if (!result.sent) {
                throw new Error(result.error || 'Error desconocido')
            }

            toast({
                title: 'Solicitud enviada',
                description: `Enviada por ${result.channel === 'email' ? 'email' : 'WhatsApp'}. El cliente recibirá un enlace para firmar.`,
            })
            setShowSendForm(false)
            setSendCustomerId('')
            load()
        } catch (err) {
            toast({ title: 'Error al enviar', description: getErrorMessage(err), variant: 'destructive' })
        } finally {
            setSending(false)
        }
    }

    // ── Bulk send to all customers without consent ──
    const handleBulkSendRequest = async () => {
        if (customersWithoutConsent.length === 0 || sendConsentTypes.size === 0) return
        setSending(true)
        let sent = 0
        let failed = 0
        try {
            for (const cust of customersWithoutConsent) {
                try {
                    const result = await sendConsentRequest({
                        companyId,
                        customerId: cust.id,
                        consentTypes: Array.from(sendConsentTypes),
                        channel: sendChannel,
                    })
                    if (result.sent) sent++
                    else failed++
                } catch {
                    failed++
                }
            }
            toast({
                title: 'Envío masivo completado',
                description: `${sent} enviada${sent !== 1 ? 's' : ''} correctamente${failed > 0 ? `, ${failed} fallida${failed !== 1 ? 's' : ''}` : ''}.`,
                variant: failed > 0 ? 'destructive' : undefined,
            })
            setShowSendForm(false)
            setBulkMode(false)
            load()
        } catch (err) {
            toast({ title: 'Error en envío masivo', description: getErrorMessage(err), variant: 'destructive' })
        } finally {
            setSending(false)
        }
    }

    // ── Resend ──
    const handleResend = async (req: ConsentRequest & { customers?: Customer }) => {
        setSending(true)
        try {
            const result = await sendConsentRequest({
                companyId,
                customerId: req.customer_id,
                consentTypes: req.consent_types,
                channel: req.channel,
            })

            if (!result.sent) throw new Error(result.error)
            toast({ title: 'Solicitud reenviada' })
            load()
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' })
        } finally {
            setSending(false)
        }
    }

    const toggleSendConsentType = (ct: ConsentType) => {
        setSendConsentTypes(prev => {
            const next = new Set(prev)
            if (next.has(ct)) next.delete(ct)
            else next.add(ct)
            return next
        })
    }

    // ── Filtering ──
    const filtered = consents.filter(c => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            c.customers?.name?.toLowerCase().includes(s) ||
            c.customers?.cif?.toLowerCase().includes(s) ||
            CONSENT_LABELS[c.consent_type]?.label.toLowerCase().includes(s)
        )
    })

    const filteredRequests = requests.filter(r => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            r.customers?.name?.toLowerCase().includes(s) ||
            r.customers?.cif?.toLowerCase().includes(s) ||
            r.status.toLowerCase().includes(s)
        )
    })

    const customersWithoutConsent = customers.filter(cust => {
        const custConsents = consents.filter(c => c.customer_id === cust.id && c.granted)
        return !custConsents.some(c => c.consent_type === 'data_processing')
    })


    const hasAnyChannel = availableChannels.email || availableChannels.whatsapp

    return (
        <div>
            {/* Missing consents warning */}
            {customersWithoutConsent.length > 0 && (
                <div style={{
                    padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                            {customersWithoutConsent.length} cliente{customersWithoutConsent.length > 1 ? 's' : ''} sin consentimiento de tratamiento de datos
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#a16207', marginLeft: '0.5rem' }}>
                            (obligatorio RGPD Art. 6)
                        </span>
                    </div>
                    {hasAnyChannel ? (
                        <button
                            onClick={() => { setBulkMode(true); setShowSendForm(true) }}
                            style={{
                                padding: '0.375rem 0.75rem', borderRadius: 6,
                                background: '#d97706', color: '#fff', border: 'none',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Send size={11} /> Enviar a todos ({customersWithoutConsent.length})
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/settings')}
                            style={{
                                padding: '0.375rem 0.75rem', borderRadius: 6,
                                background: '#2563eb', color: '#fff', border: 'none',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Settings size={11} /> Configurar Email
                        </button>
                    )}
                </div>
            )}

            {/* View toggle + toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setViewMode('consents')}
                        style={{
                            padding: '0.4rem 0.75rem', borderRadius: '6px 0 0 6px',
                            border: '1px solid #e2e8f0',
                            background: viewMode === 'consents' ? '#2563eb' : '#fff',
                            color: viewMode === 'consents' ? '#fff' : '#64748b',
                            fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Consentimientos ({consents.length})
                    </button>
                    <button
                        onClick={() => setViewMode('requests')}
                        style={{
                            padding: '0.4rem 0.75rem', borderRadius: '0 6px 6px 0',
                            border: '1px solid #e2e8f0', borderLeft: 'none',
                            background: viewMode === 'requests' ? '#2563eb' : '#fff',
                            color: viewMode === 'requests' ? '#fff' : '#64748b',
                            fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        <FileSignature size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Solicitudes ({requests.length})
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                paddingLeft: 32, padding: '0.4rem 0.75rem 0.4rem 2rem',
                                borderRadius: 8, border: '1px solid #e2e8f0',
                                fontSize: '0.8125rem', width: 200,
                            }}
                        />
                    </div>
                    {hasAnyChannel ? (
                        <button
                            onClick={() => { setBulkMode(false); setSendCustomerId(''); setShowSendForm(true) }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.75rem', borderRadius: 8,
                                background: '#15803d', color: '#fff', border: 'none',
                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Send size={13} /> Enviar Solicitud
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/settings')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.75rem', borderRadius: 8,
                                background: '#2563eb', color: '#fff', border: 'none',
                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Settings size={13} /> Configurar Email
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════ SEND CONSENT REQUEST FORM ═══════ */}
            {showSendForm && (
                <div style={{
                    padding: '1.25rem', marginBottom: '1rem',
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                        <Send size={16} color="#15803d" />
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                            {bulkMode ? 'Envío Masivo de Consentimiento' : 'Enviar Solicitud de Consentimiento'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            — Se enviará un enlace seguro para firmar digitalmente
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        {/* Customer / Bulk info */}
                        <div>
                            {bulkMode ? (
                                <>
                                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                        Destinatarios
                                    </label>
                                    <div style={{
                                        padding: '0.5rem 0.75rem', borderRadius: 6,
                                        background: '#fef9c3', border: '1px solid #fde68a',
                                        fontSize: '0.8125rem', color: '#92400e', fontWeight: 600,
                                    }}>
                                        {customersWithoutConsent.length} cliente{customersWithoutConsent.length !== 1 ? 's' : ''} sin consentimiento
                                    </div>
                                    <div style={{ marginTop: 6, maxHeight: 100, overflowY: 'auto', fontSize: '0.75rem', color: '#64748b' }}>
                                        {customersWithoutConsent.map(c => (
                                            <div key={c.id}>{c.name} ({c.cif})</div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                        Cliente *
                                    </label>
                                    <select
                                        value={sendCustomerId}
                                        onChange={e => setSendCustomerId(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff' }}
                                    >
                                        <option value="">Seleccionar cliente...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.cif})</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Channel */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Canal de envío
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setSendChannel('email')}
                                    disabled={!availableChannels.email}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '0.5rem', borderRadius: 6,
                                        border: `1.5px solid ${sendChannel === 'email' ? '#2563eb' : '#e2e8f0'}`,
                                        background: sendChannel === 'email' ? '#eff6ff' : '#fff',
                                        color: !availableChannels.email ? '#cbd5e1' : sendChannel === 'email' ? '#2563eb' : '#64748b',
                                        fontSize: '0.8125rem', fontWeight: 600, cursor: availableChannels.email ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <Mail size={14} /> Email
                                    {!availableChannels.email && <span style={{ fontSize: '0.625rem' }}>(no config.)</span>}
                                </button>
                                <button
                                    onClick={() => setSendChannel('whatsapp')}
                                    disabled={!availableChannels.whatsapp}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '0.5rem', borderRadius: 6,
                                        border: `1.5px solid ${sendChannel === 'whatsapp' ? '#15803d' : '#e2e8f0'}`,
                                        background: sendChannel === 'whatsapp' ? '#f0fdf4' : '#fff',
                                        color: !availableChannels.whatsapp ? '#cbd5e1' : sendChannel === 'whatsapp' ? '#15803d' : '#64748b',
                                        fontSize: '0.8125rem', fontWeight: 600, cursor: availableChannels.whatsapp ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                    {!availableChannels.whatsapp && <span style={{ fontSize: '0.625rem' }}>(no config.)</span>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Consent types multi-select */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                            Consentimientos a solicitar
                        </label>
                        <div style={{ display: 'grid', gap: 6 }}>
                            {(Object.entries(CONSENT_LABELS) as [ConsentType, typeof CONSENT_LABELS[ConsentType]][]).map(([key, val]) => {
                                const isSelected = sendConsentTypes.has(key)
                                return (
                                    <label
                                        key={key}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '0.625rem 0.75rem', borderRadius: 8,
                                            border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            background: isSelected ? '#eff6ff' : '#fff',
                                            cursor: 'pointer', transition: 'all 0.1s',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSendConsentType(key)}
                                            style={{ accentColor: '#2563eb', width: 16, height: 16 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                                {val.label}
                                            </span>
                                            {val.required && (
                                                <span style={{
                                                    marginLeft: 6, fontSize: '0.5625rem', fontWeight: 700,
                                                    background: '#fef3c7', color: '#92400e',
                                                    padding: '1px 4px', borderRadius: 3,
                                                }}>
                                                    OBLIGATORIO
                                                </span>
                                            )}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                                {val.description}
                                            </div>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* Legal preview toggle */}
                    <button
                        onClick={() => setShowLegalPreview(!showLegalPreview)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '0.375rem 0.625rem', borderRadius: 6,
                            border: '1px solid #e2e8f0', background: '#fff',
                            fontSize: '0.75rem', color: '#64748b', cursor: 'pointer',
                            marginBottom: '0.75rem',
                        }}
                    >
                        {showLegalPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {showLegalPreview ? 'Ocultar texto legal' : 'Ver texto legal que recibirá el cliente'}
                    </button>

                    {showLegalPreview && (
                        <div style={{
                            padding: '1rem', background: '#fff', borderRadius: 8,
                            border: '1px solid #e2e8f0', marginBottom: '0.75rem',
                            maxHeight: 200, overflowY: 'auto',
                        }}>
                            {Array.from(sendConsentTypes).map(ct => {
                                const info = CONSENT_LEGAL_TEXTS[ct]
                                return (
                                    <div key={ct} style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                                            {info.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                                            {info.text}
                                        </div>
                                    </div>
                                )
                            })}
                            {sendConsentTypes.size === 0 && (
                                <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                    Seleccione al menos un consentimiento
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => { setShowSendForm(false); setBulkMode(false) }}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        {bulkMode ? (
                            <button
                                onClick={handleBulkSendRequest}
                                disabled={customersWithoutConsent.length === 0 || sendConsentTypes.size === 0 || sending}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '0.4rem 0.875rem', borderRadius: 6, border: 'none',
                                    background: '#d97706', color: '#fff', fontSize: '0.8125rem',
                                    fontWeight: 600, cursor: customersWithoutConsent.length === 0 || sendConsentTypes.size === 0 || sending ? 'not-allowed' : 'pointer',
                                    opacity: customersWithoutConsent.length === 0 || sendConsentTypes.size === 0 || sending ? 0.6 : 1,
                                }}
                            >
                                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                {sending ? 'Enviando...' : `Enviar a ${customersWithoutConsent.length} por ${sendChannel === 'email' ? 'Email' : 'WhatsApp'}`}
                            </button>
                        ) : (
                            <button
                                onClick={handleSendRequest}
                                disabled={!sendCustomerId || sendConsentTypes.size === 0 || sending}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '0.4rem 0.875rem', borderRadius: 6, border: 'none',
                                    background: '#15803d', color: '#fff', fontSize: '0.8125rem',
                                    fontWeight: 600, cursor: !sendCustomerId || sendConsentTypes.size === 0 || sending ? 'not-allowed' : 'pointer',
                                    opacity: !sendCustomerId || sendConsentTypes.size === 0 || sending ? 0.6 : 1,
                                }}
                            >
                                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                {sending ? 'Enviando...' : `Enviar por ${sendChannel === 'email' ? 'Email' : 'WhatsApp'}`}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ CONSENTS VIEW ═══════ */}
            {viewMode === 'consents' && (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '3rem', color: '#94a3b8',
                            background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                        }}>
                                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>No hay consentimientos registrados</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#a16207' }}>
                                Es obligatorio registrar el consentimiento de tratamiento de datos (RGPD Art. 6) antes de gestionar contratos.
                                Registra o envia solicitudes de consentimiento a tus clientes.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {filtered.map(consent => {
                                const info = CONSENT_LABELS[consent.consent_type]
                                return (
                                    <div
                                        key={consent.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.75rem 1rem', borderRadius: 10,
                                            background: '#fff', border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8,
                                                background: consent.granted ? '#dcfce7' : '#fee2e2',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {consent.granted
                                                    ? <Check size={14} color="#15803d" />
                                                    : <X size={14} color="#dc2626" />
                                                }
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                                    {consent.customers?.name || 'Cliente'}
                                                    <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                                        {consent.customers?.cif}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {info?.label || consent.consent_type}
                                                    {info?.required && (
                                                        <span style={{
                                                            marginLeft: '0.375rem', fontSize: '0.625rem', fontWeight: 700,
                                                            background: '#fef3c7', color: '#92400e', padding: '1px 4px',
                                                            borderRadius: 3,
                                                        }}>
                                                            OBLIGATORIO
                                                        </span>
                                                    )}
                                                    <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                                                        — {consent.method === 'digital' ? 'Digital' : consent.method === 'written' ? 'Escrito' : consent.method === 'verbal_recorded' ? 'Verbal' : consent.method === 'checkbox' ? 'Checkbox' : consent.method || 'Sin método'} ·{' '}
                                                        {consent.granted_at
                                                            ? new Date(consent.granted_at).toLocaleDateString('es-ES')
                                                            : 'Pendiente'}
                                                        {consent.granted_by === 'customer_self' && (
                                                            <span style={{
                                                                marginLeft: 6, fontSize: '0.625rem', fontWeight: 600,
                                                                color: '#15803d', background: '#f0fdf4',
                                                                padding: '1px 4px', borderRadius: 3,
                                                            }}>
                                                                FIRMA DIGITAL
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {consent.granted && (
                                            <button
                                                onClick={() => handleRevoke(consent.id)}
                                                style={{
                                                    padding: '0.3rem 0.6rem', borderRadius: 6,
                                                    border: '1px solid #fecaca', background: '#fff',
                                                    color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer',
                                                }}
                                            >
                                                Revocar
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ═══════ REQUESTS VIEW ═══════ */}
            {viewMode === 'requests' && (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '3rem', color: '#94a3b8',
                            background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                        }}>
                            <FileSignature size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                            <div style={{ fontSize: '0.875rem' }}>No hay solicitudes de consentimiento enviadas</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                Envía una solicitud con enlace de firma digital a tus clientes
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {filteredRequests.map(req => {
                                const statusConfig = REQUEST_STATUS_CONFIG[req.status] || REQUEST_STATUS_CONFIG.sent
                                const StatusIcon = statusConfig.icon
                                const isExpired = req.status !== 'signed' && req.status !== 'rejected' && new Date(req.expires_at) < new Date()

                                return (
                                    <div
                                        key={req.id}
                                        style={{
                                            padding: '0.875rem 1rem', borderRadius: 10,
                                            background: '#fff', border: `1px solid ${isExpired ? '#fecaca' : '#e2e8f0'}`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '2px 8px', borderRadius: 6,
                                                    background: statusConfig.bg, color: statusConfig.color,
                                                    fontSize: '0.6875rem', fontWeight: 700,
                                                    border: `1px solid ${statusConfig.border}`,
                                                }}>
                                                    <StatusIcon size={11} /> {statusConfig.label}
                                                </span>
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: 4,
                                                    background: req.channel === 'email' ? '#dbeafe' : '#dcfce7',
                                                    color: req.channel === 'email' ? '#1d4ed8' : '#15803d',
                                                    fontSize: '0.625rem', fontWeight: 700,
                                                }}>
                                                    {req.channel === 'email' ? 'EMAIL' : 'WHATSAPP'}
                                                </span>
                                                {isExpired && (
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: 4,
                                                        background: '#dc2626', color: '#fff',
                                                        fontSize: '0.625rem', fontWeight: 700,
                                                    }}>
                                                        EXPIRADA
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                                    {req.customers?.name || 'Cliente'}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {req.customers?.cif}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {['sent', 'viewed', 'expired'].includes(req.status) && (
                                                    <button
                                                        onClick={() => handleResend(req)}
                                                        disabled={sending}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            padding: '0.25rem 0.5rem', borderRadius: 6,
                                                            border: '1px solid #e2e8f0', background: '#fff',
                                                            fontSize: '0.75rem', color: '#64748b', cursor: 'pointer',
                                                        }}
                                                    >
                                                        <RefreshCw size={11} /> Reenviar
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                            <span>
                                                Enviada: {req.sent_at ? new Date(req.sent_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                            </span>
                                            {req.viewed_at && (
                                                <span>
                                                    Vista: {new Date(req.viewed_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            )}
                                            {req.signed_at && (
                                                <span style={{ color: '#15803d', fontWeight: 600 }}>
                                                    Firmada: {new Date(req.signed_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                                    {req.signer_name && ` por ${req.signer_name}`}
                                                    {req.signer_nif && ` (${req.signer_nif})`}
                                                </span>
                                            )}
                                            <span>
                                                Expira: {new Date(req.expires_at).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>

                                        {/* Consent types requested */}
                                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                            {req.consent_types.map(ct => {
                                                const info = CONSENT_LABELS[ct]
                                                return (
                                                    <span
                                                        key={ct}
                                                        style={{
                                                            padding: '1px 6px', borderRadius: 4,
                                                            background: '#f1f5f9', color: '#475569',
                                                            fontSize: '0.6875rem',
                                                        }}
                                                    >
                                                        {info?.label || ct}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
