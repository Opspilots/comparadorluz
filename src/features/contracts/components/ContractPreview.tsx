import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { PDFViewer } from '@react-pdf/renderer'
import { ContractDocument } from './ContractDocument'
import { ArrowLeft, Settings, ArrowRightLeft, Loader2, Send } from 'lucide-react'
import { SwitchingTracker } from './SwitchingTracker'
import { SwitchingDialog } from './SwitchingDialog'
import type { Customer, SupplyPoint, TariffVersion, ContractTemplate, SwitchingStatus, Contract } from '@/shared/types'
import type { Supplier } from '@/types/tariff'
import { useToast } from '@/hooks/use-toast'
import { sendContractNotification } from '@/features/contracts/lib/contract-notification'

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
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [contract, setContract] = useState<ContractPreviewData | null>(null)
    const [template, setTemplate] = useState<ContractTemplate | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [notificationLoading, setNotificationLoading] = useState(false)
    const [switchingDialogOpen, setSwitchingDialogOpen] = useState(false)

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

                // switching is now handled by SwitchingTracker component
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

    const handleResendNotification = async () => {
        if (!contract) return
        setNotificationLoading(true)

        try {
            const result = await sendContractNotification({
                contractId: contract.id,
                companyId: contract.company_id,
                contractNumber: contract.contract_number,
                customerName: contract.customers?.name || 'Cliente',
                customerId: contract.customer_id,
                supplierName: contract.tariff_versions?.suppliers?.name || contract.tariff_versions?.supplier_name || '',
                tariffName: contract.tariff_versions?.tariff_name || '',
                monthlyValue: contract.annual_value_eur / 12,
                signedAt: contract.signed_at,
                cups: contract.supply_points?.cups || undefined,
            })

            if (result.sent) {
                toast({
                    title: 'Notificacion enviada',
                    description: `Enviado por ${result.channel === 'email' ? 'email' : 'WhatsApp'}`,
                })
                setContract(prev => prev ? { ...prev, notification_sent: true } : null)
            } else {
                toast({
                    title: 'No se pudo enviar',
                    description: result.error || 'Error desconocido',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            const e = err as Error
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setNotificationLoading(false)
        }
    }

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

                    {/* Re-send notification button */}
                    <button
                        onClick={handleResendNotification}
                        disabled={notificationLoading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
                            background: contract.notification_sent ? '#f0fdf4' : 'white',
                            fontSize: '0.8125rem', color: contract.notification_sent ? '#15803d' : '#64748b',
                            cursor: notificationLoading ? 'not-allowed' : 'pointer', fontWeight: 500,
                        }}
                        title={contract.notification_sent ? 'Reenviar notificacion al cliente' : 'Enviar notificacion al cliente'}
                    >
                        {notificationLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {contract.notification_sent ? 'Reenviar' : 'Enviar al cliente'}
                    </button>

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

            {/* Origin tariff card: shows the client's current tariff vs proposed tariff */}
            {contract.origin_supplier_name && (
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

            {/* Switching Tracker */}
            {contract.switching_status && (
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

            {/* PDF Viewer */}
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
        </div>
    )
}
