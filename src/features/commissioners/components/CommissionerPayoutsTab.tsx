import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Payout {
    id: string
    commissioner_id: string
    period_month: string  // YYYY-MM-01 format
    total_amount_eur: number
    event_count: number
    status: 'draft' | 'finalized' | 'paid'
    generated_by: string
    paid_by?: string
    paid_at?: string
    payment_method?: string
    payment_reference?: string
    notes?: string
    created_at: string
    updated_at: string
}

interface CommissionerPayoutsTabProps {
    commissionerId: string
}

export function CommissionerPayoutsTab({ commissionerId }: CommissionerPayoutsTabProps) {
    const [loading, setLoading] = useState(true)
    const [payouts, setPayouts] = useState<Payout[]>([])

    useEffect(() => {
        const fetchPayouts = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('commissioner_id', commissionerId)
                .order('period_month', { ascending: false })

            if (error) {
                console.error('Error fetching payouts:', error)
            } else {
                setPayouts(data || [])
            }
            setLoading(false)
        }

        if (commissionerId) {
            fetchPayouts()
        }
    }, [commissionerId])

    const getStatusBadge = (status: string) => {
        const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }
        switch (status) {
            case 'paid':
                return <span style={{ ...base, background: '#dcfce7', color: '#166534' }}><CheckCircle size={12} /> Pagado</span>
            case 'finalized':
                return <span style={{ ...base, background: '#fef3c7', color: '#92400e' }}><Clock size={12} /> Finalizado</span>
            case 'draft':
                return <span style={{ ...base, background: '#f1f5f9', color: '#64748b' }}><AlertCircle size={12} /> Borrador</span>
            default:
                return <span style={{ ...base, background: '#f1f5f9', color: '#64748b' }}>{status}</span>
        }
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando liquidaciones...</div>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Liquidaciones Mensuales</div>
                {/* Future: Add 'Generate Payout' button available usually for admins */}
            </div>

            {payouts.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <p>No hay liquidaciones registradas para este comisionado.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Periodo</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Importe</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Estado</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Fecha Pago</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Notas</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((payout) => (
                                <tr key={payout.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                                        {new Date(payout.period_month).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                                        {payout.total_amount_eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        {getStatusBadge(payout.status)}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                        {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {payout.notes || '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        {/* Placeholder link for invoice download */}
                                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Descargar Factura">
                                            <Download size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
