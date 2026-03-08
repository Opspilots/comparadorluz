import { useState } from 'react'
import { CheckCircle, AlertCircle, Clock, WifiOff, RefreshCw, Plug, PlugZap } from 'lucide-react'
import type { Integration, IntegrationProvider } from '@/shared/types'
import { useDisconnectIntegration, useToggleSyncEnabled } from '../lib/useIntegrations'

const CAPABILITY_LABELS: Record<string, string> = {
    quote: 'Cotización',
    contract_submit: 'Envío contratos',
    switching: 'Cambio comercializadora',
    status_check: 'Estado contrato',
    consumption: 'Consumos',
}

function StatusChip({ status }: { status: Integration['status'] }) {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle size={11} />
                Activo
            </span>
        )
    }
    if (status === 'connecting') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <RefreshCw size={11} />
                Conectando…
            </span>
        )
    }
    if (status === 'error' || status === 'expired') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                <AlertCircle size={11} />
                {status === 'expired' ? 'Expirado' : 'Error'}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <WifiOff size={11} />
            Desconectado
        </span>
    )
}

interface IntegrationCardProps {
    provider: IntegrationProvider
    integration: Integration | undefined
    companyId: string
    onConnect: (provider: IntegrationProvider) => void
}

export function IntegrationCard({ provider, integration, companyId, onConnect }: IntegrationCardProps) {
    const [confirmDisconnect, setConfirmDisconnect] = useState(false)

    const disconnect = useDisconnectIntegration(companyId)
    const toggleSync = useToggleSyncEnabled(companyId)

    const handleDisconnect = async () => {
        if (!integration) return
        if (!confirmDisconnect) {
            setConfirmDisconnect(true)
            return
        }
        await disconnect.mutateAsync(integration.id)
        setConfirmDisconnect(false)
    }

    const handleToggleSync = (enabled: boolean) => {
        if (!integration) return
        toggleSync.mutate({ integrationId: integration.id, enabled })
    }

    // Provider logo or initials placeholder
    const LogoEl = provider.logo_url ? (
        <img
            src={provider.logo_url}
            alt={provider.display_name}
            className="w-10 h-10 object-contain rounded-lg"
        />
    ) : (
        <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        >
            {provider.display_name.charAt(0).toUpperCase()}
        </div>
    )

    return (
        <div
            className="bg-white rounded-[14px] border border-slate-200 p-5 flex flex-col gap-4"
            style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)' }}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                {LogoEl}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">
                            {provider.display_name}
                        </span>
                        {integration && <StatusChip status={integration.status} />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {provider.capabilities.map((cap) => (
                            <span
                                key={cap}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100"
                            >
                                {CAPABILITY_LABELS[cap] ?? cap}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error message */}
            {integration?.last_error && integration.status === 'error' && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <span className="font-medium">Error: </span>{integration.last_error}
                </div>
            )}

            {/* Sync toggle (only when active) */}
            {integration?.status === 'active' && (
                <label className="flex items-center justify-between gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <span>Sincronización automática</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={integration.sync_enabled}
                        disabled={toggleSync.isPending}
                        onClick={() => handleToggleSync(!integration.sync_enabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            integration.sync_enabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                    >
                        <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                integration.sync_enabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                </label>
            )}

            {/* Last sync info */}
            {integration?.last_sync_at && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    Último sync: {new Date(integration.last_sync_at).toLocaleString('es-ES')}
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-100 mt-auto">
                {!integration || integration.status === 'inactive' ? (
                    // No integration yet — primary connect button
                    <button
                        type="button"
                        onClick={() => onConnect(provider)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                        style={{ background: '#2563eb' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#1d4ed8')}
                        onMouseOut={e => (e.currentTarget.style.background = '#2563eb')}
                    >
                        <Plug size={14} />
                        Conectar
                    </button>
                ) : integration.status === 'error' || integration.status === 'expired' ? (
                    // Error / expired — reconnect button prominent
                    <>
                        <button
                            type="button"
                            onClick={() => onConnect(provider)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Reconectar
                        </button>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={disconnect.isPending}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                confirmDisconnect
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                            }`}
                        >
                            {confirmDisconnect ? '¿Confirmar?' : 'Desconectar'}
                        </button>
                    </>
                ) : (
                    // Active or connecting — reconfigure + disconnect
                    <>
                        <button
                            type="button"
                            onClick={() => onConnect(provider)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            <PlugZap size={14} />
                            Reconfigurar
                        </button>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={disconnect.isPending}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                confirmDisconnect
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'text-red-600 bg-red-50 hover:bg-red-100'
                            }`}
                        >
                            {confirmDisconnect ? '¿Confirmar?' : 'Desconectar'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
