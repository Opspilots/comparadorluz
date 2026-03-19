
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Commissioner } from '@/shared/types'
import { Users, Plus, FileCheck, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreateCommissionerDialog } from '../components/CreateCommissionerDialog'
import { removeEmojis } from '@/shared/lib/utils'
import { useQuery } from '@tanstack/react-query'

interface CommissionerStats {
    total_contracts: number
    total_commission_eur: number
    pending_commission_eur: number
}

interface CommissionerWithStats extends Commissioner {
    stats?: CommissionerStats
}

export function CommissionersPage() {
    const navigate = useNavigate()
    const [commissioners, setCommissioners] = useState<CommissionerWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const { data: userProfile } = useQuery({
        queryKey: ['current-user-company-commissioners'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null
            const { data } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            return data
        }
    })
    const companyId = userProfile?.company_id ?? null

    const fetchCommissioners = useCallback(async () => {
        if (!companyId) return
        setLoading(true)

        const [{ data: commissionersData, error }, { data: contractCounts }] = await Promise.all([
            supabase
                .from('commissioners')
                .select(`
                    id,
                    company_id,
                    user_id,
                    full_name,
                    email,
                    commission_default_pct,
                    created_at,
                    updated_at,
                    commissions:commission_events(amount_eur, status)
                `)
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('full_name'),
            supabase
                .from('contracts')
                .select('commercial_id')
                .eq('company_id', companyId)
        ])

        if (error) {
            console.error('Error fetching commissioners:', error)
            setLoading(false)
            return
        }

        const contractCountMap: Record<string, number> = {}
        for (const row of contractCounts || []) {
            const id = row.commercial_id as string
            contractCountMap[id] = (contractCountMap[id] || 0) + 1
        }

        const stats = (commissionersData || []).map((comm) => {
            const commissions = (comm.commissions as unknown as { amount_eur: number, status: string }[]) || []

            const totalCommission = commissions.reduce((sum: number, c) => sum + (c.amount_eur || 0), 0) || 0
            const pendingCommission = commissions
                .filter((c) => c.status === 'pending')
                .reduce((sum: number, c) => sum + (c.amount_eur || 0), 0) || 0

            return {
                id: comm.id,
                company_id: comm.company_id,
                user_id: comm.user_id,
                full_name: comm.full_name,
                email: comm.email,
                commission_default_pct: comm.commission_default_pct,
                is_active: true,
                created_at: comm.created_at,
                updated_at: comm.updated_at,

                stats: {
                    total_contracts: contractCountMap[comm.id] || 0,
                    total_commission_eur: totalCommission,
                    pending_commission_eur: pendingCommission
                }
            } as CommissionerWithStats;
        })
        setCommissioners(stats)
        setLoading(false)
    }, [companyId])

    useEffect(() => {
        fetchCommissioners()
    }, [fetchCommissioners])

    const filteredCommissioners = commissioners.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

            {/* Actions Bar */}
            <div className="mobile-actions-wrap" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="tour-commissioners-search mobile-search-full" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'white' }}
                    />
                </div>

                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn btn-primary tour-commissioners-new-btn"
                    style={{ gap: '0.5rem', display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem' }}
                >
                    <Plus size={18} />
                    Nuevo Comisionado
                </button>
            </div>

            <CreateCommissionerDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    fetchCommissioners()
                }}
            />

            {/* Commissioners Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Cargando comisionados...
                </div>
            ) : filteredCommissioners.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--color-border)' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--color-primary)' }} />
                    <h3 style={{ color: 'var(--text-primary)' }}>No hay comisionados</h3>
                    <p>Comienza agregando a tu primer comercial al equipo.</p>
                </div>
            ) : (
                <div className="card tour-commissioners-list" style={{ overflow: 'hidden' }}>
                  <div className="responsive-table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Comisionado
                                </th>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Email
                                </th>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Contratos
                                </th>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Comisión Total
                                </th>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Pendiente
                                </th>
                                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Comisión %
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommissioners.map((commissioner, index) => (
                                <tr
                                    key={commissioner.id}
                                    onClick={() => navigate(`/commissioners/${commissioner.id}`)}
                                    style={{
                                        borderBottom: index < filteredCommissioners.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#f8fafc'
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = ''
                                    }}
                                >
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a' }}>
                                            {removeEmojis(commissioner.full_name)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                                        {commissioner.email}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            padding: '0.25rem 0.75rem',
                                            background: '#eff6ff',
                                            borderRadius: '999px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: '#1d4ed8'
                                        }}>
                                            <FileCheck size={14} />
                                            {commissioner.stats?.total_contracts || 0}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#059669' }}>
                                            €{commissioner.stats?.total_commission_eur.toFixed(2) || '0.00'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.625rem',
                                            background: (commissioner.stats?.pending_commission_eur || 0) > 0 ? '#fef3c7' : '#f1f5f9',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: (commissioner.stats?.pending_commission_eur || 0) > 0 ? '#92400e' : '#64748b'
                                        }}>
                                            €{commissioner.stats?.pending_commission_eur.toFixed(2) || '0.00'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                        {commissioner.commission_default_pct ? (
                                            <span style={{
                                                fontSize: '0.925rem',
                                                fontWeight: 700,
                                                color: '#0ea5e9'
                                            }}>
                                                {commissioner.commission_default_pct}%
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>—</span>
                                        )}
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
