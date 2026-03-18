
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Commissioner } from '@/shared/types'
import { CommissionRulesTab } from '../components/CommissionRulesTab'
import { CommissionerPerformanceTab } from '../components/CommissionerPerformanceTab'
import { CommissionerContractsTab } from '../components/CommissionerContractsTab'
import { CommissionerPayoutsTab } from '../components/CommissionerPayoutsTab'
import { ArrowLeft, Settings, FileText, Wallet, Mail, TrendingUp } from 'lucide-react'

type Tab = 'performance' | 'rules' | 'contracts' | 'payouts'

export function CommissionerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<Tab>('performance')

    const { data: commissioner = null, isLoading: loading } = useQuery({
        queryKey: ['commissioner', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('commissioners')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Commissioner
        },
        enabled: !!id,
    })

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'performance', label: 'Rendimiento', icon: TrendingUp },
        { id: 'rules', label: 'Reglas de Comisión', icon: Settings },
        { id: 'contracts', label: 'Contratos', icon: FileText },
        { id: 'payouts', label: 'Liquidaciones', icon: Wallet },
    ]

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Cargando...
            </div>
        )
    }

    if (!commissioner) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Comisionado no encontrado
            </div>
        )
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Back Button + Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/commissioners')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        padding: '0.375rem'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        flexShrink: 0
                    }}>
                        {commissioner.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                            {commissioner.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <Mail size={14} />
                            {commissioner.email}
                        </div>
                    </div>
                </div>
                {commissioner.commission_default_pct && (
                    <div style={{
                        padding: '0.375rem 0.875rem',
                        background: 'var(--primary-light, #eff6ff)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Comisión
                        </span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {commissioner.commission_default_pct}%
                        </span>
                    </div>
                )}
            </div>

            {/* Tabs Header */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
                gap: '1rem'
            }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                                fontWeight: isActive ? 600 : 500,
                                background: 'none',
                                borderTop: 'none',
                                borderLeft: 'none',
                                borderRight: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tabs Content */}
            <div className="animate-fade-in">
                {activeTab === 'performance' && (
                    <CommissionerPerformanceTab commissionerId={commissioner.id} />
                )}

                {activeTab === 'rules' && (
                    <div className="tour-commissioner-rules">
                        <CommissionRulesTab commissionerId={commissioner.id} />
                    </div>
                )}

                {activeTab === 'contracts' && (
                    <div className="tour-commissioner-contracts">
                        <CommissionerContractsTab commissionerId={commissioner.id} />
                    </div>
                )}

                {activeTab === 'payouts' && (
                    <CommissionerPayoutsTab commissionerId={commissioner.id} />
                )}
            </div>
        </div>
    )
}
