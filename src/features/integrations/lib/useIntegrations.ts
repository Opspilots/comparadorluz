import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getAvailableProviders,
    getMyIntegrations,
    connectIntegration,
    disconnectIntegration,
    toggleSyncEnabled,
    getIntegrationEvents,
} from './integrations-service'
import type { Integration } from '@/shared/types'

export function useAvailableProviders() {
    return useQuery({
        queryKey: ['integration_providers'],
        queryFn: getAvailableProviders,
        staleTime: 5 * 60 * 1000, // providers list is stable
    })
}

export function useMyIntegrations(companyId: string) {
    return useQuery({
        queryKey: ['integrations', companyId],
        queryFn: () => getMyIntegrations(companyId),
        enabled: !!companyId,
    })
}

export function useConnectIntegration(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            providerId,
            credentials,
            agentConfig,
        }: {
            providerId: string
            credentials: Record<string, string>
            agentConfig: Integration['agent_config']
        }) => connectIntegration(companyId, providerId, credentials, agentConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
        },
    })
}

export function useDisconnectIntegration(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (integrationId: string) => disconnectIntegration(integrationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
        },
    })
}

export function useToggleSyncEnabled(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ integrationId, enabled }: { integrationId: string; enabled: boolean }) =>
            toggleSyncEnabled(integrationId, enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
        },
    })
}

export function useIntegrationEvents(companyId: string, integrationId?: string) {
    return useQuery({
        queryKey: ['integration_events', companyId, integrationId],
        queryFn: () => getIntegrationEvents(companyId, integrationId),
        enabled: !!companyId,
        refetchInterval: 30000,
    })
}
