import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { PDFViewer } from '@react-pdf/renderer'
import { ContractDocument } from './ContractDocument'
import { ArrowLeft, Settings, ArrowRightLeft, AlertTriangle, Shield, Send, Loader2, CheckCircle2, Mail, MessageCircle } from 'lucide-react'
import { SwitchingTracker } from './SwitchingTracker'
import { SwitchingDialog } from './SwitchingDialog'
import { sendConsentRequest, getAvailableChannels } from '@/features/compliance/lib/consent-notification'
import type { Customer, SupplyPoint, TariffVersion, ContractTemplate, SwitchingStatus, Contract, ConsentType } from '@/shared/types'
import type { Supplier } from '@/shared/types'

interface ContractPreviewData {
    id: string;
    contract_number: string;
    signed_at: string;
    annual_value_eur: number;
    status: string;
    notes?: string;
    activation_date?: string;
    switching_status?: SwitchingStatus | null;
    switching_requested_at?: string | null;
    notification_sent?: boolean;
    company_id: string;
    customer_id: string;
    // Origin tariff (from comparator)
    origin_supplier_name?: string | null;
    origin_tariff_name?: string | null;
    origin_annual_cost_eur?: number | null;
    customers?: Customer;
    supply_points?: SupplyPoint;
    tariff_versions?: TariffVersion & { suppliers?: Supplier };
}

export function ContractPreview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [contract, setContract] = useState<ContractPreviewData | null>(null)
    const [template, setTemplate] = useState<ContractTemplate | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [switchingDialogOpen, setSwitchingDialogOpen] = useState(false)

    // Consent checking
    const [missingConsents, setMissingConsents] = useState<ConsentType[]>([])
    const [consentChecked, setConsentChecked] = useState(false)
    const [sendingConsent, setSendingConsent] = useState(false)
    const [consentSent, setConsentSent] = useState(false)
    const [availableChannels, setAvailableChannels] = useState<{ email: boolean; whatsapp: boolean }>({ email: false, whatsapp: false })

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [contractRes, templateRes] = await Promise.all([
                    supabase
                        .from('contracts')
                        .select(`
                            *,
                            customers (*),
                            supply_points (*),
                            tariff_versions (
                                *,
                                suppliers (*)
                            )
                        `)
                        .eq('id', id)
                        .single(),
                    supabase
                        .from('contract_templates')
                        .select('*')
                        .single(),
                ])

                if (contractRes.error) throw contractRes.error
                setContract(contractRes.data)
                if (!templateRes.error) setTemplate(templateRes.data)

                // Check required consents for this customer
                const customerId = contractRes.data?.customer_id
                if (customerId) {
                    const requiredTypes: ConsentType[] = ['data_processing', 'commercial_contact', 'switching_authorization']

                    const { data: grantedConsents } = await supabase
                        .from('customer_consents')
                        .select('consent_type')
                        .eq('customer_id', customerId)
                        .eq('granted', true)
                        .is('revoked_at', null)

                    const grantedTypes = (grantedConsents || []).map(c => c.consent_type as ConsentType)
                    const missing = requiredTypes.filter(t => !grantedTypes.includes(t))
                    setMissingConsents(missing)

                    // Check available channels
                    if (missing.length > 0 && contractRes.data?.company_id) {
                        const { data: company } = await supabase
                            .from('companies')
                            .select('messaging_settings')
                            .eq('id', contractRes.data.company_id)
                            .single()
                        setAvailableChannels(getAvailableChannels(company?.messaging_settings || null))
                    }
                }
                setConsentChecked(true)
            } catch (err) {
                const e = err as Error
                console.error('Error fetching contract for preview:', e)
                setError(e.message || 'Error al cargar el contrato')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#64748b' }}>Preparando vista previa del contrato...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    if (error || !contract) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Contrato no encontrado'}</p>
                <button onClick={() => navigate('/contracts')} className="btn btn-secondary">Volver a la lista</button>
            </div>
        )
    }

    const canRequestSwitching = (contract.status === 'signed' || contract.status === 'active') &&
        !contract.switching_status

    const refetchContract = async () => {
        const { data } = await supabase
            .from('contracts')
            .select(`*, customers (*), supply_points (*), tariff_versions (*, suppliers (*))`)
            .eq('id', id)
            .single()
        if (data) setContract(data)
    }

    const CONSENT_LABELS: Record<ConsentType, string> = {
        data_processing: 'Tratamiento de datos (RGPD Art. 6)',
        commercial_contact: 'Contacto comercial (RD 88/2026)',
        switching_authorization: 'Autorizacion de cambio (CNMC)',
        data_sharing: 'Cesion a terceros',
        marketing: 'Comunicaciones comerciales',
    }

    const handleSendConsentRequest = async (channel: 'email' | 'whatsapp') => {
        if (!contract) return
        setSendingConsent(true)
        try {
            const result = await sendConsentRequest({
                companyId: contract.company_id,
                customerId: contract.customer_id,
                consentTypes: missingConsents,
                channel,
            })
            if (result.sent) {
                setConsentSent(true)
            } else {
                console.error('Consent request failed:', result.error)
                alert(`Error al enviar solicitud: ${result.error}`)
            }
        } catch (err) {
            console.error('Error sending consent request:', err)
        } finally {
            setSendingConsent(false)
        }
    }

    const handleRechecConsents = async () => {
        if (!contract) return
        const { data: grantedConsents } = await supabase
            .from('customer_consents')
            .select('consent_type')
            .eq('customer_id', contract.customer_id)
            .eq('granted', true)
            .is('revoked_at', null)

        const requiredTypes: ConsentType[] = ['data_processing', 'commercial_contact', 'switching_authorization']
        const grantedTypes = (grantedConsents || []).map(c => c.consent_type as ConsentType)
        const missing = requiredTypes.filter(t => !grantedTypes.includes(t))
        setMissingConsents(missing)
        if (missing.length === 0) setConsentSent(false)
    }

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={() => navigate('/contracts')}
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} color="#64748b" />
                    </button>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                        Vista Previa: {contract.contract_number}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Cliente: <strong>{contract.customers?.name}</strong>
                    </div>

                    {/* Switching button */}
                    {canRequestSwitching && (
                        <button
                            onClick={() => setSwitchingDialogOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', border: '1px solid #2563eb', borderRadius: 8,
                                background: '#2563eb', fontSize: '0.8125rem', color: '#fff',
                                cursor: 'pointer', fontWeight: 500,
                            }}
                            title="Iniciar traspaso de comercializadora"
                        >
                            <ArrowRightLeft size={14} />
                            Iniciar Traspaso
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/contracts/template')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                        title="Personalizar plantilla"
                    >
                        <Settings size={14} />
                        Personalizar plantilla
                    </button>
                </div>
            </div>

            {/* Origin tariff card: shows the client's current tariff vs proposed tariff (hidden when switching completed) */}
            {contract.origin_supplier_name && contract.switching_status !== 'completed' && (
                <div
                    style={{
                        padding: '0.875rem 1.25rem',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                        <ArrowRightLeft size={14} style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Cambio de Comercializadora
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            flex: 1, padding: '0.5rem 0.75rem',
                            background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca',
                        }}>
                            <div style={{ fontSize: '0.625rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Tarifa Actual (Origen)
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#7f1d1d', marginTop: 2 }}>
                                {contract.origin_supplier_name}
                            </div>
                            {contract.origin_tariff_name && (
                                <div style={{ fontSize: '0.75rem', color: '#7f1d1d', marginTop: 2 }}>
                                    {contract.origin_tariff_name}
                                </div>
                            )}
                            {contract.origin_annual_cost_eur && (
                                <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: 2 }}>
                                    {Math.round(contract.origin_annual_cost_eur)} €/año
                                </div>
                            )}
                        </div>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                        }}>
                            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>→</span>
                        </div>
                        <div style={{
                            flex: 1, padding: '0.5rem 0.75rem',
                            background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0',
                        }}>
                            <div style={{ fontSize: '0.625rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Nueva Tarifa (Destino)
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#14532d', marginTop: 2 }}>
                                {contract.tariff_versions?.suppliers?.name || contract.tariff_versions?.supplier_name || '—'}
                            </div>
                            {contract.tariff_versions?.tariff_name && (
                                <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 2 }}>
                                    {contract.tariff_versions.tariff_name}
                                </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: 2 }}>
                                {Math.round(contract.annual_value_eur)} €/año
                            </div>
                        </div>
                        {contract.origin_annual_cost_eur && (
                            <div style={{
                                padding: '0.375rem 0.75rem', borderRadius: 8,
                                background: (contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#ecfdf5' : '#fef2f2',
                                border: `1px solid ${(contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#a7f3d0' : '#fecaca'}`,
                                textAlign: 'center', flexShrink: 0,
                            }}>
                                <div style={{
                                    fontSize: '0.9375rem', fontWeight: 700,
                                    color: (contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#059669' : '#dc2626',
                                }}>
                                    {(contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '-' : '+'}
                                    {Math.abs(Math.round(contract.origin_annual_cost_eur - contract.annual_value_eur))} €
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#64748b' }}>al año</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Switching Tracker (hidden when completed — contract is now the active one) */}
            {contract.switching_status && contract.switching_status !== 'completed' && (
                <SwitchingTracker
                    contract={contract as Contract & { switching_notes?: string | null; switching_completed_at?: string | null; estimated_activation_date?: string | null; switching_from_contract_id?: string | null }}
                    onStatusChange={refetchContract}
                />
            )}

            {/* Switching Dialog */}
            <SwitchingDialog
                contract={contract as Contract}
                open={switchingDialogOpen}
                onOpenChange={setSwitchingDialogOpen}
                onSuccess={refetchContract}
            />

            {/* Consent wall — blocks PDF preview until required consents are granted */}
            {consentChecked && missingConsents.length > 0 ? (
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0',
                }}>
                    <div style={{ maxWidth: 480, width: '100%', padding: '2rem' }}>
                        {!consentSent ? (
                            <>
                                {/* Warning header */}
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 14, margin: '0 auto 1rem',
                                        background: '#fffbeb', border: '1px solid #fde68a',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Shield size={28} color="#d97706" />
                                    </div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                                        Consentimientos requeridos
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 6 }}>
                                        Antes de enviar el contrato a <strong>{contract.customers?.name || 'el cliente'}</strong>,
                                        es necesario obtener los siguientes consentimientos obligatorios.
                                    </div>
                                </div>

                                {/* Missing consents list */}
                                <div style={{
                                    borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb',
                                    padding: '0.75rem 1rem', marginBottom: '1.25rem',
                                }}>
                                    {missingConsents.map((ct, i) => (
                                        <div key={ct} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '0.5rem 0',
                                            borderTop: i > 0 ? '1px solid #fef3c7' : 'none',
                                        }}>
                                            <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                                                    {CONSENT_LABELS[ct]}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Send consent request buttons */}
                                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center' }}>
                                    Envia una solicitud de consentimiento al cliente:
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    {availableChannels.email && (
                                        <button
                                            onClick={() => handleSendConsentRequest('email')}
                                            disabled={sendingConsent}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 20px', borderRadius: 10,
                                                border: 'none', background: '#2563eb', color: '#fff',
                                                fontSize: '0.8125rem', fontWeight: 600,
                                                cursor: sendingConsent ? 'not-allowed' : 'pointer',
                                                opacity: sendingConsent ? 0.7 : 1,
                                                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                            }}
                                        >
                                            {sendingConsent ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                                            Enviar por Email
                                        </button>
                                    )}
                                    {availableChannels.whatsapp && (
                                        <button
                                            onClick={() => handleSendConsentRequest('whatsapp')}
                                            disabled={sendingConsent}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 20px', borderRadius: 10,
                                                border: 'none', background: '#15803d', color: '#fff',
                                                fontSize: '0.8125rem', fontWeight: 600,
                                                cursor: sendingConsent ? 'not-allowed' : 'pointer',
                                                opacity: sendingConsent ? 0.7 : 1,
                                                boxShadow: '0 2px 8px rgba(21,128,61,0.3)',
                                            }}
                                        >
                                            {sendingConsent ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                                            Enviar por WhatsApp
                                        </button>
                                    )}
                                    {!availableChannels.email && !availableChannels.whatsapp && (
                                        <div style={{
                                            padding: '0.75rem 1rem', borderRadius: 10,
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            fontSize: '0.8125rem', color: '#991b1b',
                                            textAlign: 'center',
                                        }}>
                                            No hay canales de mensajeria configurados.
                                            Configura Email o WhatsApp en los ajustes de la empresa para poder enviar solicitudes de consentimiento.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Consent sent — waiting */
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 14, margin: '0 auto 1rem',
                                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Send size={28} color="#15803d" />
                                    </div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                                        Solicitud de consentimiento enviada
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 6 }}>
                                        Se ha enviado la solicitud a <strong>{contract.customers?.name}</strong>.
                                        Cuando el cliente firme los consentimientos, podras ver el contrato.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button
                                        onClick={handleRechecConsents}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '10px 20px', borderRadius: 10,
                                            border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a',
                                            fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        <CheckCircle2 size={15} />
                                        Verificar consentimientos
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* PDF Viewer — shown only when all required consents are granted */
                <div style={{ flex: 1, backgroundColor: '#525659', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                    <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                        <ContractDocument
                            contract={{
                                contract_number: contract.contract_number,
                                signed_at: contract.signed_at,
                                annual_value_eur: contract.annual_value_eur,
                                status: contract.status,
                                notes: contract.notes,
                                activation_date: contract.activation_date,
                            }}
                            customer={contract.customers}
                            tariff={contract.tariff_versions}
                            supplyPoint={contract.supply_points}
                            template={template}
                        />
                    </PDFViewer>
                </div>
            )}
        </div>
    )
}
