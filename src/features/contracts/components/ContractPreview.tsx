import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { PDFViewer } from '@react-pdf/renderer'
import { ContractDocument } from './ContractDocument'
import { ArrowLeft } from 'lucide-react'

export function ContractPreview() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [contract, setContract] = useState<any>(null) // Using any here as a stopgap to fix the build, will define proper interface in next refinement if needed
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchContractData = async () => {
            try {
                const { data, error } = await supabase
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
                    .single()

                if (error) throw error
                setContract(data)
            } catch (err) {
                const error = err as Error;
                console.error('Error fetching contract for preview:', error)
                setError(error.message || 'Error al cargar el contrato')
            } finally {
                setLoading(false)
            }
        }

        fetchContractData()
    }, [id])

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#64748b' }}>Preparando vista previa del contrato...</p>
                </div>
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
                    <button onClick={() => navigate('/contracts')} className="btn btn-secondary" style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                        Vista Previa: {contract.contract_number}
                    </div>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Cliente: <strong>{contract.customers?.name}</strong>
                </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#525659', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                    <ContractDocument
                        contract={{
                            contract_number: contract.contract_number,
                            signed_at: contract.signed_at,
                            annual_value_eur: contract.annual_value_eur
                        }}
                        customer={contract.customers}
                        tariff={contract.tariff_versions}
                        supplyPoint={contract.supply_points}
                    />
                </PDFViewer>
            </div>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
