import { useState, useEffect } from 'react'
import { Plug } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import type { IntegrationProvider } from '@/shared/types'
import { useAvailableProviders, useMyIntegrations } from '../lib/useIntegrations'
import { IntegrationCard } from '../components/IntegrationCard'
import { IntegrationSetupModal } from '../components/IntegrationSetupModal'
import { IntegrationEventLog } from '../components/IntegrationEventLog'

function CardSkeleton() {
    return (
        <div className="bg-white rounded-[14px] border border-slate-200 p-5 animate-pulse"
            style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)' }}>
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg" />
        </div>
    )
}

export function IntegrationsPage() {
    const [companyId, setCompanyId] = useState<string>('')
    const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null)

    const { data: providers, isLoading: providersLoading } = useAvailableProviders()
    const { data: myIntegrations, isLoading: integrationsLoading } = useMyIntegrations(companyId)

    useEffect(() => {
        // Use the existing SECURITY DEFINER RPC function to avoid RLS issues
        // on the users table when fetching company_id
        supabase.rpc('get_auth_company_id').then(({ data, error }) => {
            if (!error && data) setCompanyId(data as string)
        })
    }, [])

    const isLoading = providersLoading || integrationsLoading || !companyId

    // Build a lookup: provider_id → Integration
    const integrationByProvider = Object.fromEntries(
        (myIntegrations ?? []).map((i) => [i.provider_id, i])
    )

    const connectedCount = (myIntegrations ?? []).filter(
        (i) => i.status === 'active' || i.status === 'connecting'
    ).length

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2.5 mb-1">
                    <Plug size={22} className="text-blue-600" />
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Integraciones
                    </h1>
                </div>
                <p className="text-slate-500 text-sm">
                    Conecta tu CRM con las comercializadoras con las que trabajas
                </p>

                {!isLoading && connectedCount > 0 && (
                    <p className="mt-2 text-xs text-emerald-600 font-medium">
                        {connectedCount} integración{connectedCount !== 1 ? 'es' : ''} activa{connectedCount !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {isLoading
                    ? [...Array(6)].map((_, i) => <CardSkeleton key={i} />)
                    : (providers ?? []).map((provider) => (
                        <IntegrationCard
                            key={provider.id}
                            provider={provider}
                            integration={integrationByProvider[provider.id]}
                            companyId={companyId}
                            onConnect={setSelectedProvider}
                        />
                    ))}
            </div>

            {/* Event log section */}
            <section>
                <div className="mb-4">
                    <h2 className="text-base font-semibold text-slate-800">
                        Historial de eventos
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Últimos webhooks recibidos de las comercializadoras. Se actualiza cada 30 segundos.
                    </p>
                </div>
                {companyId && <IntegrationEventLog companyId={companyId} />}
            </section>

            {/* Setup modal */}
            <IntegrationSetupModal
                provider={selectedProvider}
                companyId={companyId}
                existingIntegration={
                    selectedProvider ? integrationByProvider[selectedProvider.id] : undefined
                }
                onClose={() => setSelectedProvider(null)}
            />
        </div>
    )
}
