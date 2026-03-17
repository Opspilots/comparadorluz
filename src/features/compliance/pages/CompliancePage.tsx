import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { ConsentManager } from '../components/ConsentManager'
import { DataSubjectRequests } from '../components/DataSubjectRequests'
import { DataRetentionSettings } from '../components/DataRetentionSettings'
import {
    Shield,
    FileCheck,
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

            {/* Tabs */}
            <div className="tour-compliance-tabs" style={{
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
            <div className="tour-compliance-content">
                {activeTab === 'consents' && <ConsentManager companyId={companyId} />}
                {activeTab === 'arco' && <DataSubjectRequests companyId={companyId} />}
                {activeTab === 'retention' && <DataRetentionSettings companyId={companyId} />}
            </div>
        </div>
    )
}
