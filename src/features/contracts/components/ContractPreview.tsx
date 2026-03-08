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
