
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Commissioner } from '@/shared/types'
import { CommissionRulesTab } from '../components/CommissionRulesTab'
import { CommissionerContractsTab } from '../components/CommissionerContractsTab'
import { CommissionerPayoutsTab } from '../components/CommissionerPayoutsTab'
import { CommissionerPerformanceTab } from '../components/CommissionerPerformanceTab'
import { ArrowLeft, User as UserIcon, Settings, FileText, Wallet, TrendingUp } from 'lucide-react'

type Tab = 'profile' | 'rules' | 'performance' | 'contracts' | 'payouts'

export function CommissionerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [commissioner, setCommissioner] = useState<Commissioner | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('profile')

    useEffect(() => {
        if (id) {
            fetchCommissioner()
        }
    }, [id])

    const fetchCommissioner = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('commissioners')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching commissioner:', error)
        } else {
            setCommissioner(data)
        }
        setLoading(false)
    }

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'profile', label: 'Perfil', icon: UserIcon },
        { id: 'rules', label: 'Reglas de Comisión', icon: Settings },
        { id: 'performance', label: 'Rendimiento', icon: TrendingUp },
        { id: 'contracts', label: 'Contratos', icon: FileText },
        { id: 'payouts', label: 'Liquidaciones', icon: Wallet },
    ]

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Cargando...
            </div>
        )
    }

    if (!commissioner) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Comisionado no encontrado
            </div>
        )
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/commissioners')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#0ea5e9',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    fontSize: '0.925rem',
                    fontWeight: 500
                }}
            >
                <ArrowLeft size={18} />
                Volver a Comisionados
            </button>

            {/* Header */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '2rem',
                        fontWeight: 600
                    }}>
                        {commissioner.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                            {commissioner.full_name}
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
                            {commissioner.email}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                background: commissioner.is_active ? '#dcfce7' : '#f1f5f9',
                                color: commissioner.is_active ? '#166534' : '#64748b',
                                fontWeight: 500
                            }}>
                                {commissioner.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                    {commissioner.commission_default_pct && (
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                Comisión por defecto
                            </p>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0ea5e9' }}>
                                {commissioner.commission_default_pct}%
                            </p>
                        </div>
                    )}
                </div>
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
                                borderBottom: isActive ? '2px solid #0ea5e9' : '2px solid transparent',
                                color: isActive ? '#0ea5e9' : '#64748b',
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
                {activeTab === 'profile' && (
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                            Información del Perfil
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                    ID de Usuario
                                </label>
                                <p style={{ fontSize: '0.925rem', color: '#0f172a', fontFamily: 'monospace' }}>
                                    {commissioner.id}
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                    Fecha de Registro
                                </label>
                                <p style={{ fontSize: '0.925rem', color: '#0f172a' }}>
                                    {new Date(commissioner.created_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                    Última Actualización
                                </label>
                                <p style={{ fontSize: '0.925rem', color: '#0f172a' }}>
                                    {new Date(commissioner.updated_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <CommissionRulesTab commissionerId={commissioner.id} />
                )}

                {activeTab === 'performance' && (
                    <CommissionerPerformanceTab commissionerId={commissioner.id} />
                )}

                {activeTab === 'contracts' && (
                    <CommissionerContractsTab commissionerId={commissioner.id} />
                )}

                {activeTab === 'payouts' && (
                    <CommissionerPayoutsTab commissionerId={commissioner.id} />
                )}
            </div>
        </div>
    )
}
