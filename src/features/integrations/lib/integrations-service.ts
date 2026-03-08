import { supabase } from '@/shared/lib/supabase'
import { recordAuditLog } from '@/shared/lib/audit'
import type { Integration, IntegrationEvent, IntegrationProvider } from '@/shared/types'

export async function getAvailableProviders(): Promise<IntegrationProvider[]> {
    const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('is_active', true)
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
    supabase.functions
        .invoke('integration-sync', { body: { integrationId: data.id, action: 'verify' } })
        .catch((err: unknown) => console.warn('integration-sync invoke failed:', err))

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
