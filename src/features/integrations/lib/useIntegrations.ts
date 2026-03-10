import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getAvailableProviders,
    getMyIntegrations,
    connectIntegration,
    disconnectIntegration,
    toggleSyncEnabled,
    fetchIntegrationTariffs,
    getIntegrationEvents,
    fetchDatadisSupplies,
    fetchDatadisConsumption,
    getConsumptionData,
    fetchMarketPrices,
    getMarketPrices,
    fetchREDataDemand,
    fetchREDataGeneration,
} from './integrations-service'
import type { Integration } from '@/shared/types'

export function useAvailableProviders() {
    return useQuery({
        queryKey: ['integration_providers'],
        queryFn: getAvailableProviders,
        staleTime: 5 * 60 * 1000,
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

export function useFetchTariffs(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (integrationId: string) =>
            fetchIntegrationTariffs(companyId, integrationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
            queryClient.invalidateQueries({ queryKey: ['integration_events', companyId] })
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

// ---------------------------------------------------------------------------
// Datadis hooks
// ---------------------------------------------------------------------------

export function useFetchDatadisSupplies(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (integrationId: string) =>
            fetchDatadisSupplies(companyId, integrationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
            queryClient.invalidateQueries({ queryKey: ['integration_events', companyId] })
        },
    })
}

export function useFetchDatadisConsumption(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ integrationId, cups, startDate, endDate }: {
            integrationId: string
            cups: string
            startDate?: string
            endDate?: string
        }) => fetchDatadisConsumption(companyId, integrationId, cups, startDate, endDate),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
            queryClient.invalidateQueries({ queryKey: ['consumption_data', companyId, vars.cups] })
            queryClient.invalidateQueries({ queryKey: ['integration_events', companyId] })
        },
    })
}

export function useConsumptionData(companyId: string, cups: string | undefined) {
    return useQuery({
        queryKey: ['consumption_data', companyId, cups],
        queryFn: () => getConsumptionData(companyId, cups!),
        enabled: !!companyId && !!cups,
    })
}

// ---------------------------------------------------------------------------
// Market prices hooks
// ---------------------------------------------------------------------------

export function useFetchMarketPrices(companyId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ integrationId, startDate, endDate }: {
            integrationId: string
            startDate?: string
            endDate?: string
        }) => fetchMarketPrices(companyId, integrationId, startDate, endDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integrations', companyId] })
            queryClient.invalidateQueries({ queryKey: ['market_prices'] })
            queryClient.invalidateQueries({ queryKey: ['integration_events', companyId] })
        },
    })
}

export function useMarketPrices(priceType?: string, startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['market_prices', priceType ?? 'pvpc', startDate, endDate],
        queryFn: () => getMarketPrices(priceType, startDate, endDate),
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    })
}

// ---------------------------------------------------------------------------
// REData hooks (demand & generation)
// ---------------------------------------------------------------------------

export function useREDataDemand(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['redata_demand', startDate, endDate],
        queryFn: async () => {
            const result = await fetchREDataDemand(startDate, endDate)
            return result.data ?? []
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    })
}

export function useREDataGeneration(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['redata_generation', startDate, endDate],
        queryFn: async () => {
            const result = await fetchREDataGeneration(startDate, endDate)
            return result.data ?? []
        },
        staleTime: 10 * 60 * 1000,
    })
}

