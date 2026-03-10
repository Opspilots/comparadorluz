import { supabase } from '@/shared/lib/supabase'
import { recordAuditLog } from '@/shared/lib/audit'
import type { Integration, IntegrationEvent, IntegrationProvider, ConsumptionData, MarketPrice } from '@/shared/types'

export async function getAvailableProviders(): Promise<IntegrationProvider[]> {
    const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('is_active', true)
        .order('integration_mode', { ascending: true })
        .order('display_name', { ascending: true })

    if (error) throw error
    return (data ?? []) as IntegrationProvider[]
}

export async function getMyIntegrations(companyId: string): Promise<Integration[]> {
    const { data, error } = await supabase
        .from('integrations')
        .select(`
            *,
            integration_providers (*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as Integration[]
}

export async function connectIntegration(
    companyId: string,
    providerId: string,
    credentials: Record<string, string>,
    agentConfig: Integration['agent_config']
): Promise<Integration> {
    const { data, error } = await supabase
        .from('integrations')
        .upsert(
            {
                company_id: companyId,
                provider_id: providerId,
                status: 'connecting',
                credentials,
                agent_config: agentConfig,
                sync_enabled: true,
                last_error: null,
            },
            { onConflict: 'company_id,provider_id' }
        )
        .select(`*, integration_providers (*)`)
        .single()

    if (error) throw error

    await recordAuditLog({
        action: 'integration.connected',
        entity_type: 'integration',
        entity_id: data.id,
        metadata: { provider_id: providerId },
    })

    // Invoke verification edge function (best-effort; don't block on error)
    // Route to the appropriate edge function based on provider slug
    const provider = (data.integration_providers as IntegrationProvider | undefined)
    const slug = provider?.slug ?? ''
    const authType = provider?.auth_type ?? ''

    // For public APIs (auth_type: 'none'), mark as active directly — no verification needed
    if (authType === 'none') {
        await supabase
            .from('integrations')
            .update({ status: 'active', last_sync_at: new Date().toISOString(), last_error: null })
            .eq('id', data.id)
        return { ...data, status: 'active' } as Integration
    }

    const verifyFn = slug === 'datadis' ? 'datadis-sync'
        : slug === 'ree-esios' ? 'market-data-sync'
        : 'integration-sync'

    supabase.functions
        .invoke(verifyFn, { body: { integrationId: data.id, action: 'verify' } })
        .catch((err: unknown) => console.warn(`${verifyFn} invoke failed:`, err))

    return data as Integration
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
    const { error } = await supabase
        .from('integrations')
        .update({ status: 'inactive', credentials: null, sync_enabled: false })
        .eq('id', integrationId)

    if (error) throw error

    await recordAuditLog({
        action: 'integration.disconnected',
        entity_type: 'integration',
        entity_id: integrationId,
    })
}

export async function toggleSyncEnabled(integrationId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
        .from('integrations')
        .update({ sync_enabled: enabled })
        .eq('id', integrationId)

    if (error) throw error
}

export async function fetchIntegrationTariffs(
    companyId: string,
    integrationId: string
): Promise<{ ok: boolean; imported?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: { action: 'fetch_tariffs', companyId, integrationId },
    })

    if (error) throw error
    return data as { ok: boolean; imported?: number; error?: string }
}

export async function getIntegrationEvents(
    companyId: string,
    integrationId?: string
): Promise<IntegrationEvent[]> {
    let query = supabase
        .from('integration_events')
        .select('*')
        .eq('company_id', companyId)
        .order('received_at', { ascending: false })
        .limit(50)

    if (integrationId) {
        query = query.eq('integration_id', integrationId)
    }

    const { data, error } = await query

    if (error) throw error
    return (data ?? []) as IntegrationEvent[]
}

// ---------------------------------------------------------------------------
// Datadis - Consumption
// ---------------------------------------------------------------------------

export async function fetchDatadisSupplies(
    companyId: string,
    integrationId: string
): Promise<{ ok: boolean; supplies?: Array<Record<string, unknown>>; error?: string }> {
    const { data, error } = await supabase.functions.invoke('datadis-sync', {
        body: { action: 'fetch_supplies', companyId, integrationId },
    })
    if (error) throw error
    return data as { ok: boolean; supplies?: Array<Record<string, unknown>>; error?: string }
}

export async function fetchDatadisConsumption(
    companyId: string,
    integrationId: string,
    cups: string,
    startDate?: string,
    endDate?: string
): Promise<{ ok: boolean; imported?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('datadis-sync', {
        body: { action: 'fetch_consumption', companyId, integrationId, cups, startDate, endDate },
    })
    if (error) throw error
    return data as { ok: boolean; imported?: number; error?: string }
}

export async function getConsumptionData(
    companyId: string,
    cups: string,
    limit = 720 // ~30 days of hourly data
): Promise<ConsumptionData[]> {
    const { data, error } = await supabase
        .from('consumption_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('cups', cups)
        .order('date', { ascending: false })
        .order('hour', { ascending: true })
        .limit(limit)

    if (error) throw error
    return (data ?? []) as ConsumptionData[]
}

// ---------------------------------------------------------------------------
// Market Prices (REE e-sios / REData)
// ---------------------------------------------------------------------------

export async function fetchMarketPrices(
    companyId: string,
    integrationId: string,
    startDate?: string,
    endDate?: string
): Promise<{ ok: boolean; imported?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('market-data-sync', {
        body: { action: 'fetch_pvpc', companyId, integrationId, startDate, endDate },
    })
    if (error) throw error
    return data as { ok: boolean; imported?: number; error?: string }
}

export async function getMarketPrices(
    priceType: string = 'pvpc',
    startDate?: string,
    endDate?: string,
    limit = 48 // 2 days
): Promise<MarketPrice[]> {
    let query = supabase
        .from('market_prices')
        .select('*')
        .eq('price_type', priceType)
        .order('price_date', { ascending: false })
        .order('hour', { ascending: true })
        .limit(limit)

    if (startDate) query = query.gte('price_date', startDate)
    if (endDate) query = query.lte('price_date', endDate)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as MarketPrice[]
}

// ---------------------------------------------------------------------------
// Switching capability check
// ---------------------------------------------------------------------------

export interface SwitchingCapabilityResult {
    available: boolean
    integration?: Integration
    provider?: IntegrationProvider
    method: 'api' | 'manual'
}

/**
 * Check if a supplier has an active integration with 'switching' or 'contract_submit' capability.
 * Matches supplier name to provider slug and verifies the integration is active.
 */
export async function checkSwitchingCapability(
    companyId: string,
    supplierName: string
): Promise<SwitchingCapabilityResult> {
    const manual: SwitchingCapabilityResult = { available: false, method: 'manual' }

    if (!supplierName) return manual

    // Fetch all active integrations for this company with their providers
    const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*, integration_providers (*)')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .eq('sync_enabled', true)

    if (error || !integrations?.length) return manual

    // Normalize supplier name for matching
    const normalized = supplierName.toLowerCase().trim()

    for (const integration of integrations) {
        const provider = integration.integration_providers as IntegrationProvider | undefined
        if (!provider) continue

        // Match by slug or display_name
        const slugMatch = normalized.includes(provider.slug) || provider.slug.includes(normalized.split(' ')[0].toLowerCase())
        const nameMatch = provider.display_name.toLowerCase().includes(normalized) || normalized.includes(provider.display_name.toLowerCase())

        if (slugMatch || nameMatch) {
            const caps = provider.capabilities || []
            if (caps.includes('switching') || caps.includes('contract_submit')) {
                return {
                    available: true,
                    integration: integration as Integration,
                    provider,
                    method: 'api',
                }
            }
        }
    }

    return manual
}

/**
 * Submit a switching request via the integration API.
 * Returns the external switching reference if successful.
 */
export async function submitSwitchingViaApi(
    companyId: string,
    contractId: string,
    integrationId: string,
    targetTariffVersionId: string,
    cups: string,
    estimatedDate?: string
): Promise<{ ok: boolean; switchingRef?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: {
            action: 'request_switching',
            companyId,
            contractId,
            integrationId,
            targetTariffVersionId,
            cups,
            estimatedDate,
            viaApi: true,
        },
    })

    if (error) return { ok: false, error: error.message }
    return data as { ok: boolean; switchingRef?: string; error?: string }
}

// ---------------------------------------------------------------------------
// REData & CNMC — Public APIs proxied through edge function
// We call the edge function directly with fetch (bypassing supabase.functions.invoke)
// to include the anon key as Authorization header, avoiding 401 errors.
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function callMarketDataSync(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/market-data-sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Edge function responded with ${res.status}`)
    return await res.json() as Record<string, unknown>
}

export async function fetchREDataDemand(
    startDate?: string,
    endDate?: string
): Promise<{ ok: boolean; data?: Array<Record<string, unknown>> }> {
    const result = await callMarketDataSync({ action: 'fetch_demand', startDate, endDate })
    return result as { ok: boolean; data?: Array<Record<string, unknown>> }
}

export async function fetchREDataGeneration(
    startDate?: string,
    endDate?: string
): Promise<{ ok: boolean; data?: Array<Record<string, unknown>> }> {
    const result = await callMarketDataSync({ action: 'fetch_generation', startDate, endDate })
    return result as { ok: boolean; data?: Array<Record<string, unknown>> }
}

