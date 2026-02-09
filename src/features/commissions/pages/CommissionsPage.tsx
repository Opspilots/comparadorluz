
import { useState } from 'react'
import { CommissionRulesTab } from '../components/CommissionRulesTab'
import { Wallet, Settings, FileText } from 'lucide-react'

type Tab = 'rules' | 'events' | 'payouts'

export function CommissionsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('rules')

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'rules', label: 'Reglas', icon: Settings },
        { id: 'events', label: 'Eventos (Transacciones)', icon: FileText },
        { id: 'payouts', label: 'Liquidaciones', icon: Wallet },
    ]

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Comisiones
                </h1>
                <p style={{ color: '#64748b' }}>
                    Gestión de comisionado, reglas y pagos a comerciales.
                </p>
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
                {activeTab === 'rules' && <CommissionRulesTab />}

                {activeTab === 'events' && (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>Historial de Eventos</h3>
                        <p>Próximamente: Listado de comisiones generadas por contrato.</p>
                    </div>
                )}

                {activeTab === 'payouts' && (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Wallet size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>Liquidaciones Mensuales</h3>
                        <p>Próximamente: Generación de pagos y facturas de comisiones.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
