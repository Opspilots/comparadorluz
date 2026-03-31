import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { ConsentType } from '@/shared/types'
import { CONSENT_LEGAL_TEXTS } from '../lib/consent-notification'

type RequestStatus = 'sent' | 'viewed' | 'signed' | 'expired' | 'rejected'

interface ConsentRequestData {
    id: string
    company_id: string
    customer_id: string
    consent_types: ConsentType[]
    legal_text: string
    status: RequestStatus
    expires_at: string
    signed_at: string | null
    signer_name: string | null
    companies?: { name: string } | null
    customers?: { name: string; cif: string } | null
}

export function ConsentSignPage() {
    const { token } = useParams<{ token: string }>()
    const [request, setRequest] = useState<ConsentRequestData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [signerName, setSignerName] = useState('')
    const [signerNif, setSignerNif] = useState('')
    const [acceptedTypes, setAcceptedTypes] = useState<Set<ConsentType>>(new Set())
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Signature canvas
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    const loadRequest = useCallback(async () => {
        if (!token) return
        setLoading(true)
        const { data, error: fetchError } = await supabase
            .rpc('get_consent_request_by_token', { p_token: token })

        if (fetchError || !data || data.length === 0) {
            setError('Enlace no válido o expirado')
            setLoading(false)
            return
        }

        const row = data[0]
        const req: ConsentRequestData = {
            id: row.id,
            company_id: row.company_id,
            customer_id: row.customer_id,
            consent_types: row.consent_types as ConsentType[],
            legal_text: row.legal_text,
            status: row.status as RequestStatus,
            expires_at: row.expires_at,
            signed_at: row.signed_at,
            signer_name: row.signer_name,
            companies: row.company_name ? { name: row.company_name } : null,
            customers: row.customer_name ? { name: row.customer_name, cif: row.customer_cif } : null,
        }

        // Check expiry client-side (server RPC already returns unexpired only, but double-check)
        if (new Date(req.expires_at) < new Date()) {
            setError('Este enlace ha expirado. Solicite un nuevo enlace a su asesor energético.')
            setLoading(false)
            return
        }

        if (req.status === 'signed') {
            setRequest(req)
            setSuccess(true)
            setLoading(false)
            return
        }

        // Mark as viewed (narrow RLS policy allows only sent→viewed)
        if (req.status === 'sent') {
            await supabase
                .from('consent_requests')
                .update({ status: 'viewed', viewed_at: new Date().toISOString() })
                .eq('token', token)
        }

        setRequest(req)
        setLoading(false)
    }, [token])

    useEffect(() => {
        loadRequest()
    }, [loadRequest])

    // Canvas signature pad
    const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            }
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }, [])

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        const { x, y } = getCanvasCoords(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
    }, [getCanvasCoords])

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        e.preventDefault()
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        const { x, y } = getCanvasCoords(e)
        ctx.lineTo(x, y)
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        setHasSignature(true)
    }, [isDrawing, getCanvasCoords])

    const stopDraw = useCallback(() => {
        setIsDrawing(false)
    }, [])

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const toggleConsentType = (ct: ConsentType) => {
        setAcceptedTypes(prev => {
            const next = new Set(prev)
            if (next.has(ct)) next.delete(ct)
            else next.add(ct)
            return next
        })
    }

    const requiredTypes = (request?.consent_types || []).filter(ct => CONSENT_LEGAL_TEXTS[ct]?.required)
    const allRequiredAccepted = requiredTypes.every(ct => acceptedTypes.has(ct))
    const canSubmit = signerName.trim() && signerNif.trim() && allRequiredAccepted && hasSignature && !submitting

    const handleSubmit = async () => {
        if (!canSubmit || !request || !token) return
        setSubmitting(true)

        try {
            const signatureData = canvasRef.current?.toDataURL('image/png') || ''

            // IP should be resolved server-side in the RPC to avoid third-party
            // client-side requests and GDPR concerns with external services.
            const clientIp = 'server-side'

            // Use secure RPC — validates token, checks expiry, and does all writes atomically
            const { data: result, error: rpcErr } = await supabase
                .rpc('sign_consent_request', {
                    p_token: token,
                    p_signer_name: signerName.trim(),
                    p_signer_nif: signerNif.trim().toUpperCase(),
                    p_signer_ip: clientIp,
                    p_signature_data: signatureData,
                    p_accepted_types: Array.from(acceptedTypes),
                })

            if (rpcErr) throw rpcErr

            if (result && !result.success) {
                setError(result.error || 'Error al firmar.')
                return
            }

            setSuccess(true)
        } catch (err) {
            console.error('Error signing consent:', err)
            setError('Error al firmar. Inténtelo de nuevo.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Styles ──
    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)',
        fontFamily: "'Outfit', 'Segoe UI', sans-serif",
        padding: '24px 16px',
    }

    const cardStyle: React.CSSProperties = {
        maxWidth: 640,
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
    }

    const headerStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        padding: '28px 32px',
        color: '#ffffff',
    }

    if (loading) {
        return (
            <div style={pageStyle}>
                <div style={{ ...cardStyle, padding: '60px 32px', textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                        borderRadius: '50%', margin: '0 auto 16px',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    <div style={{ color: '#64748b', fontSize: '0.9375rem' }}>Cargando documento...</div>
                </div>
            </div>
        )
    }

    if (error && !request) {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ ...headerStyle, background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Enlace no disponible</div>
                    </div>
                    <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%', background: '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', fontSize: '24px',
                        }}>
                            ✕
                        </div>
                        <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>
                            {error}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            Si necesita un nuevo enlace, contacte con su asesor energético.
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ ...headerStyle, background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Consentimiento Firmado</div>
                        <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginTop: 4 }}>
                            {request?.companies?.name || ''}
                        </div>
                    </div>
                    <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', fontSize: '28px', border: '2px solid #bbf7d0',
                        }}>
                            ✓
                        </div>
                        <div style={{ color: '#0f172a', fontSize: '1.125rem', fontWeight: 700, marginBottom: 8 }}>
                            Documento firmado correctamente
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                            Su consentimiento ha sido registrado. Puede revocar cualquier consentimiento
                            en cualquier momento contactando con {request?.companies?.name || 'su asesor energético'},
                            conforme al Art. 7.3 del RGPD.
                        </div>
                        {request?.signed_at && (
                            <div style={{
                                marginTop: 20, padding: '10px 16px', background: '#f8fafc',
                                borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-block',
                                fontSize: '0.8125rem', color: '#64748b',
                            }}>
                                Firmado el {new Date(request.signed_at).toLocaleString('es-ES')}
                                {request.signer_name && ` por ${request.signer_name}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ── Main signing form ──
    const companyName = (request?.companies as { name: string } | null)?.name || 'Empresa'
    const customerName = (request?.customers as { name: string; cif: string } | null)?.name || 'Cliente'
    const consentTypes = request?.consent_types || []

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Solicitud de Consentimiento
                    </div>
                    <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginTop: 4 }}>
                        {companyName} — Cumplimiento RGPD / LOPD-GDD
                    </div>
                </div>

                <div style={{ padding: '28px 32px' }}>
                    {/* Customer info */}
                    <div style={{
                        padding: '14px 16px', background: '#f8fafc', borderRadius: 10,
                        border: '1px solid #e2e8f0', marginBottom: 24,
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            Destinatario
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                            {customerName}
                        </div>
                    </div>

                    {/* Consent types with legal text */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                            Consentimientos solicitados
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {consentTypes.map(ct => {
                                const info = CONSENT_LEGAL_TEXTS[ct]
                                if (!info) return null
                                const isAccepted = acceptedTypes.has(ct)
                                return (
                                    <label
                                        key={ct}
                                        style={{
                                            display: 'flex', gap: 12, padding: '14px 16px',
                                            borderRadius: 10, cursor: 'pointer',
                                            border: `1.5px solid ${isAccepted ? '#2563eb' : '#e2e8f0'}`,
                                            background: isAccepted ? '#eff6ff' : '#ffffff',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isAccepted}
                                            onChange={() => toggleConsentType(ct)}
                                            style={{
                                                width: 18, height: 18, marginTop: 2,
                                                accentColor: '#2563eb', flexShrink: 0,
                                            }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                                                {info.label}
                                                {info.required && (
                                                    <span style={{
                                                        marginLeft: 6, fontSize: '0.625rem', fontWeight: 700,
                                                        background: '#fef3c7', color: '#92400e',
                                                        padding: '2px 5px', borderRadius: 3, verticalAlign: 'middle',
                                                    }}>
                                                        OBLIGATORIO
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                                                {info.text}
                                            </div>
                                            <a
                                                href={info.docUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-block', marginTop: 6, fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                                            >
                                                Leer documentacion completa: {info.docLabel}
                                            </a>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* Legal notice */}
                    <div style={{
                        padding: '14px 16px', background: '#fffbeb', borderRadius: 10,
                        border: '1px solid #fef08a', marginBottom: 24, fontSize: '0.8125rem',
                        color: '#92400e', lineHeight: 1.5,
                    }}>
                        <strong>Información sobre sus derechos (RGPD Art. 7.3):</strong> Puede retirar su
                        consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento
                        basado en el consentimiento previo a su retirada. Para ejercer este derecho o cualquier
                        derecho ARCO+ (acceso, rectificación, supresión, limitación, portabilidad, oposición),
                        contacte con el Delegado de Protección de Datos de {companyName}.
                    </div>

                    {/* Signer identification */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                            Identificación del firmante
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '0.75rem', fontWeight: 600,
                                    color: '#64748b', textTransform: 'uppercase', marginBottom: 6,
                                }}>
                                    Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    placeholder="Nombre y apellidos"
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8,
                                        border: '1px solid #e2e8f0', fontSize: '0.875rem',
                                        outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '0.75rem', fontWeight: 600,
                                    color: '#64748b', textTransform: 'uppercase', marginBottom: 6,
                                }}>
                                    NIF / CIF *
                                </label>
                                <input
                                    type="text"
                                    value={signerNif}
                                    onChange={e => setSignerNif(e.target.value.toUpperCase())}
                                    placeholder="12345678A"
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8,
                                        border: '1px solid #e2e8f0', fontSize: '0.875rem',
                                        fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Signature pad */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                                Firma digital *
                            </div>
                            {hasSignature && (
                                <button
                                    onClick={clearSignature}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6,
                                        border: '1px solid #e2e8f0', background: '#fff',
                                        fontSize: '0.75rem', color: '#64748b', cursor: 'pointer',
                                    }}
                                >
                                    Borrar firma
                                </button>
                            )}
                        </div>
                        <div style={{
                            border: `2px dashed ${hasSignature ? '#2563eb' : '#e2e8f0'}`,
                            borderRadius: 10, overflow: 'hidden', background: '#fafbfc',
                            position: 'relative',
                        }}>
                            <canvas
                                ref={canvasRef}
                                width={576}
                                height={160}
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={stopDraw}
                                onMouseLeave={stopDraw}
                                onTouchStart={startDraw}
                                onTouchMove={draw}
                                onTouchEnd={stopDraw}
                                style={{
                                    width: '100%', height: 160,
                                    cursor: 'crosshair', touchAction: 'none',
                                }}
                            />
                            {!hasSignature && (
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    color: '#94a3b8', fontSize: '0.8125rem',
                                    pointerEvents: 'none',
                                }}>
                                    Dibuje su firma aquí
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '10px 14px', background: '#fef2f2', borderRadius: 8,
                            border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8125rem',
                            marginBottom: 16,
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 10,
                            border: 'none', background: canSubmit ? '#2563eb' : '#94a3b8',
                            color: '#ffffff', fontSize: '0.9375rem', fontWeight: 700,
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            transition: 'background 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {submitting ? (
                            <>
                                <span style={{
                                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                                    animation: 'spin 1s linear infinite',
                                }} />
                                Firmando...
                            </>
                        ) : (
                            'Firmar Consentimiento'
                        )}
                    </button>

                    {/* Validity info */}
                    <div style={{
                        marginTop: 16, textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8',
                    }}>
                        Válido hasta {request?.expires_at ? new Date(request.expires_at).toLocaleDateString('es-ES') : '—'}
                        &nbsp;· Firma electrónica conforme al Reglamento eIDAS
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
