import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { TrendingUp, FileCheck, DollarSign, Wallet } from 'lucide-react'

interface CommissionerPerformanceTabProps {
    commissionerId: string
}

export function CommissionerPerformanceTab({ commissionerId }: CommissionerPerformanceTabProps) {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalContracts: 0,
        totalCommission: 0,
        pendingCommission: 0,
        paidCommission: 0,
        avgCommission: 0
    })

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)

            // 1. Fetch Commissions (Commission Events)
            const { data: commissions, error: commError } = await supabase
                .from('commission_events')
                .select('amount_eur, status')
                .eq('commissioner_id', commissionerId)

            if (commError) {
                console.error('Error fetching commissions:', commError)
            }

            // 2. Fetch Contracts count
            const { count, error: contractError } = await supabase
                .from('contracts')
                .select('*', { count: 'exact', head: true })
                .eq('commercial_id', commissionerId)

            if (contractError) {
                console.error('Error fetching contracts:', contractError)
            }

            if (commissions) {
                const total = commissions.reduce((sum, c) => sum + (c.amount_eur || 0), 0)
                const pending = commissions
                    .filter(c => c.status === 'pending')
                    .reduce((sum, c) => sum + (c.amount_eur || 0), 0)
                const paid = commissions
                    .filter(c => c.status === 'paid')
                    .reduce((sum, c) => sum + (c.amount_eur || 0), 0)

                const contractsCount = count || 0
                const avg = contractsCount > 0 ? total / contractsCount : 0

                setStats({
                    totalContracts: contractsCount,
                    totalCommission: total,
                    pendingCommission: pending,
                    paidCommission: paid,
                    avgCommission: avg
                })
            }
            setLoading(false)
        }

        if (commissionerId) {
            fetchStats()
        }
    }, [commissionerId])

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Calculando métricas...</div>
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {/* Total Contracts */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                    <div style={{ padding: '0.5rem', background: '#e0f2fe', borderRadius: '8px', color: '#0ea5e9' }}>
                        <FileCheck size={20} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contratos Totales</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                    {stats.totalContracts}
                </div>
            </div>

            {/* Total Commission */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                    <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '8px', color: '#166534' }}>
                        <DollarSign size={20} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Comisión Generada</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                    {stats.totalCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
            </div>

            {/* Pending Commission */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                    <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '8px', color: '#b45309' }}>
                        <Wallet size={20} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Comisión Pendiente</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                    {stats.pendingCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Pagado: {stats.paidCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
            </div>

            {/* Avg Commission */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                    <div style={{ padding: '0.5rem', background: '#f3e8ff', borderRadius: '8px', color: '#7e22ce' }}>
                        <TrendingUp size={20} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Media / Contrato</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                    {stats.avgCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
            </div>
        </div>
    )
}
