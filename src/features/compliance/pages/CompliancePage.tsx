import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { ConsentManager } from '../components/ConsentManager'
import { DataSubjectRequests } from '../components/DataSubjectRequests'
import { DataRetentionSettings } from '../components/DataRetentionSettings'
import {
    Shield,
    FileCheck,
    Clock,
    Database,
} from 'lucide-react'

type Tab = 'consents' | 'arco' | 'retention'

export function CompliancePage() {
    const [activeTab, setActiveTab] = useState<Tab>('consents')
    const [companyId, setCompanyId] = useState<string | null>(null)
    useEffect(() => {
        supabase.rpc('get_auth_company_id').then(({ data }) => {
            if (data) setCompanyId(data as string)
        })
    }, [])

    const tabs: { key: Tab; label: string; icon: typeof Shield; description: string }[] = [
        { key: 'consents', label: 'Consentimientos', icon: FileCheck, description: 'RGPD Art.7 + RD 88/2026' },
        { key: 'arco', label: 'Derechos ARCO+', icon: Shield, description: 'RGPD Arts. 15-22' },
        { key: 'retention', label: 'Retencion de Datos', icon: Database, description: 'RGPD Art. 5.1.e' },
    ]

    if (!companyId) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Cargando...
            </div>
        )
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid #bfdbfe',
                    }}>
                        <Shield size={18} color="#2563eb" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                            Cumplimiento Normativo
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                            RGPD / LOPD-GDD / RD 88/2026 — Gestion de consentimientos, derechos ARCO+ y retencion de datos
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <ComplianceSummary companyId={companyId} />

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0', paddingBottom: '0',
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${isActive ? '#2563eb' : 'transparent'}`,
                                color: isActive ? '#2563eb' : '#64748b',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                marginBottom: '-1px',
                            }}
                        >
                            <Icon size={15} />
                            {tab.label}
                            <span style={{
                                fontSize: '0.625rem', color: isActive ? '#3b82f6' : '#94a3b8',
                                fontWeight: 400,
                            }}>
                                {tab.description}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            {activeTab === 'consents' && <ConsentManager companyId={companyId} />}
            {activeTab === 'arco' && <DataSubjectRequests companyId={companyId} />}
            {activeTab === 'retention' && <DataRetentionSettings companyId={companyId} />}
        </div>
    )
}

function ComplianceSummary({ companyId }: { companyId: string }) {
    const [stats, setStats] = useState({
        totalConsents: 0,
        pendingConsents: 0,
        openRequests: 0,
        overdueRequests: 0,
    })

    useEffect(() => {
        const load = async () => {
            const [consents, requests] = await Promise.all([
                supabase
                    .from('customer_consents')
                    .select('id, granted', { count: 'exact' })
                    .eq('company_id', companyId)
                    .is('revoked_at', null),
                supabase
                    .from('data_subject_requests')
                    .select('id, status, deadline_at', { count: 'exact' })
                    .eq('company_id', companyId)
                    .in('status', ['pending', 'in_progress', 'extended']),
            ])

            const consentData = consents.data || []
            const requestData = requests.data || []
            const now = new Date().toISOString()

            setStats({
                totalConsents: consentData.length,
                pendingConsents: consentData.filter(c => !c.granted).length,
                openRequests: requestData.length,
                overdueRequests: requestData.filter(r => r.deadline_at < now).length,
            })
        }
        load()
    }, [companyId])

    const cards = [
        { label: 'Consentimientos activos', value: stats.totalConsents, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: FileCheck },
        { label: 'Sin consentimiento', value: stats.pendingConsents, color: stats.pendingConsents > 0 ? '#d97706' : '#15803d', bg: stats.pendingConsents > 0 ? '#fffbeb' : '#f0fdf4', border: stats.pendingConsents > 0 ? '#fef08a' : '#bbf7d0', icon: FileCheck },
        { label: 'Solicitudes ARCO+ abiertas', value: stats.openRequests, color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff', icon: Shield },
        { label: 'Solicitudes vencidas', value: stats.overdueRequests, color: stats.overdueRequests > 0 ? '#dc2626' : '#15803d', bg: stats.overdueRequests > 0 ? '#fef2f2' : '#f0fdf4', border: stats.overdueRequests > 0 ? '#fecaca' : '#bbf7d0', icon: Clock },
    ]

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {cards.map((card, i) => {
                const Icon = card.icon
                return (
                    <div key={i} style={{
                        padding: '1rem', borderRadius: 12,
                        background: card.bg, border: `1px solid ${card.border}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Icon size={14} color={card.color} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {card.label}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>
                            {card.value}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
