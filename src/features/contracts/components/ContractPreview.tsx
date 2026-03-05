import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { PDFViewer } from '@react-pdf/renderer'
import { ContractDocument } from './ContractDocument'
import { ArrowLeft, Settings } from 'lucide-react'
import type { Customer, SupplyPoint, TariffVersion, ContractTemplate } from '@/shared/types'
import type { Supplier } from '@/types/tariff'

interface ContractPreviewData {
    id: string;
    contract_number: string;
    signed_at: string;
    annual_value_eur: number;
    status: string;
    notes?: string;
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
                // Template may not exist yet — that's fine
                if (!templateRes.error) setTemplate(templateRes.data)
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

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Cliente: <strong>{contract.customers?.name}</strong>
                    </div>
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

            <div style={{ flex: 1, backgroundColor: '#525659', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                    <ContractDocument
                        contract={{
                            contract_number: contract.contract_number,
                            signed_at: contract.signed_at,
                            annual_value_eur: contract.annual_value_eur,
                            status: contract.status,
                            notes: contract.notes,
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
