import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getStatusChipClass } from '@/shared/lib/statusColors'

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
    const [fetchError, setFetchError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPayouts = async () => {
            setLoading(true)
            setFetchError(null)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) { setLoading(false); return }

            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('commissioner_id', commissionerId)
                .order('period_month', { ascending: false })

            if (error) {
                console.error('Error fetching payouts:', error)
                setFetchError('No se pudieron cargar las liquidaciones.')
            } else {
                setPayouts(data || [])
            }
            setLoading(false)
        }

        if (commissionerId) {
            fetchPayouts()
        }
    }, [commissionerId])

    const downloadPayoutCsv = (payout: Payout) => {
        const period = new Date(payout.period_month).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
        const amount = payout.total_amount_eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        const paidAt = payout.paid_at ? new Date(payout.paid_at).toLocaleDateString('es-ES') : ''
        const rows = [
            ['Periodo', 'Importe', 'Eventos', 'Estado', 'Fecha Pago', 'Referencia Pago', 'Notas'],
            [period, amount, String(payout.event_count), payout.status, paidAt, payout.payment_reference ?? '', payout.notes ?? ''],
        ]
        const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `liquidacion_${payout.period_month}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const payoutStatusLabels: Record<string, string> = {
        paid: 'Pagado',
        finalized: 'Finalizado',
        draft: 'Borrador',
    }

    const payoutStatusIcons: Record<string, JSX.Element> = {
        paid: <CheckCircle size={12} />,
        finalized: <Clock size={12} />,
        draft: <AlertCircle size={12} />,
    }

    const getStatusBadge = (status: string) => (
        <span className={getStatusChipClass(status)}>
            {payoutStatusIcons[status] ?? <AlertCircle size={12} />}
            {payoutStatusLabels[status] ?? status}
        </span>
    )

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando liquidaciones...</div>
    }

    if (fetchError) {
        return (
            <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{fetchError}</span>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex justify-between items-center mb-4">
                <div style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Liquidaciones Mensuales</div>
                {/* Future: Add 'Generate Payout' button available usually for admins */}
            </div>

            {payouts.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>No hay liquidaciones registradas para este comisionado.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="responsive-table-wrap">
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
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            title="Descargar CSV"
                                            onClick={() => downloadPayoutCsv(payout)}
                                        >
                                            <Download size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                </div>
            )}
        </div>
    )
}
