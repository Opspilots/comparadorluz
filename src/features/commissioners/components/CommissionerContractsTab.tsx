import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Contract } from '@/shared/types'
import { Eye } from 'lucide-react'

interface CommissionerContractsTabProps {
    commissionerId: string
}

export function CommissionerContractsTab({ commissionerId }: CommissionerContractsTabProps) {
    const [loading, setLoading] = useState(true)
    const [contracts, setContracts] = useState<Contract[]>([])

    useEffect(() => {
        const fetchContracts = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) { setLoading(false); return }

            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    customers (name, cif),
                    tariff_versions (
                        tariff_name,
                        suppliers (name)
                    )
                `)
                .eq('company_id', profile.company_id)
                .eq('commercial_id', commissionerId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching contracts:', error)
            } else {
                setContracts(data || [])
            }
            setLoading(false)
        }

        if (commissionerId) {
            fetchContracts()
        }
    }, [commissionerId])

    // Spanish translations for status
    const statusLabels: Record<string, string> = {
        'pending': 'Pendiente',
        'signed': 'Firmado',
        'active': 'Activo',
        'cancelled': 'Cancelado',
        'completed': 'Completado'
    }

    const badgeStyle = (status: string) => {
        const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, border: '1px solid transparent' }
        switch (status) {
            case 'active': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
            case 'signed': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
            case 'pending': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
            case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
            default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
        }
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando contratos...</div>
    }

    if (contracts.length === 0) {
        return (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <p>Este comisionado no tiene contratos registrados.</p>
            </div>
        )
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Ref. Contrato</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Cliente</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Tarifa</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Estado</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>Valor Anual</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((contract) => (
                            <tr key={contract.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                                    {contract.contract_number || '---'}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ fontWeight: 500 }}>{contract.customers?.name || '---'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{contract.customers?.cif}</div>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <div>{contract.tariff_versions?.tariff_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{contract.tariff_versions?.suppliers?.name}</div>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={badgeStyle(contract.status)}>
                                        {statusLabels[contract.status] || contract.status}
                                    </span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                                    {contract.annual_value_eur?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <Link
                                        to={`/contracts/${contract.id}/view`}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.3rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', width: 'fit-content' }}
                                    >
                                        <Eye size={14} /> Ver
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
