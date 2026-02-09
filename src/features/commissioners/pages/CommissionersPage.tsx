
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Commissioner } from '@/shared/types'
import { Users, Plus, TrendingUp, DollarSign, FileCheck, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CreateCommissionerDialog } from '../components/CreateCommissionerDialog'

interface CommissionerStats {
    total_contracts: number
    total_commission_eur: number
    pending_commission_eur: number
}

interface CommissionerWithStats extends Commissioner {
    stats?: CommissionerStats
}

export function CommissionersPage() {
    const [commissioners, setCommissioners] = useState<CommissionerWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    useEffect(() => {
        fetchCommissioners()
    }, [])

    const fetchCommissioners = async () => {
        setLoading(true)

        // Fetch commissioners with stats
        // Note: Relation names must match what PostgREST detects. 
        // contracts.commercial_id -> commissioners.id
        // commission_events.commissioner_id -> commissioners.id

        const { data: commissionersData, error } = await supabase
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
                contracts:contracts(count),
                commissions:commission_events(amount_eur, status)
            `)
            .eq('is_active', true)
            .is('user_id', null) // Only show external commissioners (not system users)
            .order('full_name')

        if (error) {
            console.error('Error fetching commissioners:', error)
            setLoading(false)
            return
        }

        const stats = commissionersData.map((comm: any) => {
            const totalCommission = comm.commissions?.reduce((sum: number, c: any) => sum + (c.amount_eur || 0), 0) || 0
            const pendingCommission = comm.commissions
                ?.filter((c: any) => c.status === 'pending')
                .reduce((sum: number, c: any) => sum + (c.amount_eur || 0), 0) || 0

            const totalContracts = comm.contracts?.[0]?.count || 0

            return {
                id: comm.id,
                company_id: comm.company_id,
                user_id: comm.user_id,
                full_name: comm.full_name,
                email: comm.email,
                commission_default_pct: comm.commission_default_pct,
                is_active: true,
                created_at: comm.created_at,
                updated_at: comm.created_at,

                stats: {
                    total_contracts: totalContracts,
                    total_commission_eur: totalCommission,
                    pending_commission_eur: pendingCommission
                }
            } as CommissionerWithStats
        })
        setCommissioners(stats)
        setLoading(false)
    }

    const filteredCommissioners = commissioners.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Actions Bar */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                    />
                </div>

                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn btn-primary"
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

            {/* Commissioners Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Cargando comisionados...
                </div>
            ) : filteredCommissioners.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>No hay comisionados</h3>
                    <p>Comienza agregando a tu primer comercial al equipo.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filteredCommissioners.map((commissioner) => (
                        <Link
                            key={commissioner.id}
                            to={`/commissioners/${commissioner.id}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="card" style={{
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderLeft: '4px solid #0ea5e9',
                                height: '100%'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)'
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = ''
                                }}
                            >
                                {/* Avatar and Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        fontWeight: 600
                                    }}>
                                        {commissioner.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                                            {commissioner.full_name}
                                        </h3>
                                        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                            {commissioner.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                                        <FileCheck size={16} style={{ color: '#0ea5e9' }} />
                                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Contratos:</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginLeft: 'auto' }}>
                                            {commissioner.stats?.total_contracts || 0}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                                        <DollarSign size={16} style={{ color: '#10b981' }} />
                                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Comisión Total:</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginLeft: 'auto' }}>
                                            €{commissioner.stats?.total_commission_eur.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '6px' }}>
                                        <TrendingUp size={16} style={{ color: '#f59e0b' }} />
                                        <span style={{ fontSize: '0.875rem', color: '#92400e' }}>Pendiente:</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e', marginLeft: 'auto' }}>
                                            €{commissioner.stats?.pending_commission_eur.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                </div>

                                {/* Default Commission */}
                                {commissioner.commission_default_pct && (
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Comisión por defecto
                                        </span>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0ea5e9', marginTop: '0.25rem' }}>
                                            {commissioner.commission_default_pct}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
