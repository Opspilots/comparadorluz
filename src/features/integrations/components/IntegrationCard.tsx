import { useState } from 'react'
import {
    CheckCircle, AlertCircle, Clock, WifiOff, RefreshCw,
    Plug, PlugZap, Download, Database, Zap, ChevronDown, ChevronUp,
    BarChart3, FileText, Activity
} from 'lucide-react'
import type { Integration, IntegrationProvider } from '@/shared/types'
import {
    useDisconnectIntegration, useToggleSyncEnabled, useFetchTariffs,
    useFetchMarketPrices, useFetchDatadisSupplies
} from '../lib/useIntegrations'

const CAPABILITY_LABELS: Record<string, string> = {
    quote: 'Cotizacion',
    contract_submit: 'Envio contratos',
    switching: 'Cambio comercializadora',
    status_check: 'Estado contrato',
    consumption: 'Consumos',
}

const MODE_CONFIG = {
    api: {
        icon: Zap,
        label: 'API',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    data_platform: {
        icon: Database,
        label: 'Plataforma de datos',
        color: 'bg-violet-50 text-violet-700 border-violet-200',
    },
} as const

// Detailed platform descriptions for data_platform providers
interface PlatformDetail {
    what: string
    dataProvided: Array<{ icon: typeof BarChart3; label: string; detail: string }>
    howItWorks: string
    crmUsage: string
}

const PLATFORM_DETAILS: Record<string, PlatformDetail> = {
    'datadis': {
        what: 'Datadis es la plataforma oficial de las distribuidoras electricas españolas (i-DE, e-Distribucion, UFD, Viesgo, e-Redes). Centraliza los datos de consumo de todos los puntos de suministro en España, independientemente de la comercializadora contratada.',
        dataProvided: [
            { icon: BarChart3, label: 'Consumos horarios', detail: 'Datos reales de kWh por hora, dia y periodo (P1/P2/P3) para cada CUPS' },
            { icon: Activity, label: 'Potencia maxima demandada', detail: 'Registro de la potencia maxima en cada periodo, util para optimizar la potencia contratada' },
            { icon: FileText, label: 'Datos contractuales', detail: 'Informacion del contrato actual: comercializadora, potencia contratada, tipo de tarifa' },
        ],
        howItWorks: 'Necesitas una cuenta gratuita en datadis.es con tu NIF/CIF autorizado. El sistema se conecta a su API privada para obtener los datos de consumo de cualquier CUPS asociado a tu NIF.',
        crmUsage: 'Los consumos importados alimentan directamente el comparador de tarifas: en lugar de estimar el consumo anual, se usan datos reales hora a hora para calcular el coste exacto con cada tarifa. Tambien permite detectar si la potencia contratada esta sobredimensionada.',
    },
    'ree-esios': {
        what: 'e-sios es el sistema de informacion del operador del sistema electrico español (Red Electrica / REE). Publica los precios oficiales del mercado electrico en tiempo real, incluyendo el PVPC (tarifa regulada).',
        dataProvided: [
            { icon: BarChart3, label: 'Precios PVPC horarios', detail: 'Precio regulado del kWh para cada hora del dia, publicado diariamente a las 20:15h para el dia siguiente' },
            { icon: Activity, label: 'Precio pool (mercado spot)', detail: 'Precio mayorista de la electricidad, base para tarifas indexadas al pool' },
            { icon: FileText, label: 'Indicadores de mercado', detail: 'Mas de 1.400 indicadores: costes regulados, peajes, pagos por capacidad, restricciones tecnicas' },
        ],
        howItWorks: 'Solicita un token gratuito enviando un email a consultasios@ree.es indicando tu nombre y uso. El token se incluye en cada peticion para autenticar el acceso a la API.',
        crmUsage: 'Los precios PVPC se usan como referencia para comparar tarifas reguladas vs. mercado libre. Los precios pool permiten calcular el coste real de tarifas indexadas. El widget de precios en la pagina muestra la evolucion horaria para el dia actual.',
    },
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
                Conectando...
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
    const [syncResult, setSyncResult] = useState<string | null>(null)
    const [showDetails, setShowDetails] = useState(false)

    const disconnect = useDisconnectIntegration(companyId)
    const toggleSync = useToggleSyncEnabled(companyId)
    const fetchTariffs = useFetchTariffs(companyId)
    const fetchMarketPrices = useFetchMarketPrices(companyId)
    const fetchSupplies = useFetchDatadisSupplies(companyId)

    const mode = provider.integration_mode ?? 'api'
    const modeConfig = MODE_CONFIG[mode]
    const ModeIcon = modeConfig.icon

    const canFetchTariffs =
        integration?.status === 'active' &&
        provider.capabilities.includes('quote') &&
        provider.slug === 'octopus'

    const canFetchPrices =
        integration?.status === 'active' &&
        provider.slug === 'ree-esios'

    const canFetchConsumption =
        integration?.status === 'active' &&
        provider.slug === 'datadis'


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

    const handleFetchData = async () => {
        if (!integration) return
        setSyncResult(null)

        try {
            if (canFetchTariffs) {
                const res = await fetchTariffs.mutateAsync(integration.id)
                setSyncResult(res.ok ? `Importadas ${res.imported ?? 0} tarifas` : `Error: ${res.error}`)
            } else if (canFetchPrices) {
                const res = await fetchMarketPrices.mutateAsync({ integrationId: integration.id })
                setSyncResult(res.ok ? `Importados ${res.imported ?? 0} precios` : `Error: ${res.error}`)
            } else if (canFetchConsumption) {
                const res = await fetchSupplies.mutateAsync(integration.id)
                const persisted = (res as Record<string, unknown>).persisted as number | undefined
                setSyncResult(res.ok ? `Importados ${persisted ?? 0} puntos de suministro` : `Error: ${res.error}`)
            }
        } catch (err) {
            setSyncResult(`Error: ${err instanceof Error ? err.message : 'desconocido'}`)
        }
    }

    const isSyncing = fetchTariffs.isPending || fetchMarketPrices.isPending || fetchSupplies.isPending

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
            style={{
                background: mode === 'data_platform'
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            }}
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

                    {/* Mode badge */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${modeConfig.color}`}>
                            <ModeIcon size={10} />
                            {modeConfig.label}
                        </span>
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

            {/* Description & detailed info */}
            {(() => {
                const details = PLATFORM_DETAILS[provider.slug]
                if (details) {
                    return (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {provider.description}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 self-start"
                            >
                                {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {showDetails ? 'Ocultar detalles' : 'Ver que datos ofrece y como se usa'}
                            </button>
                            {showDetails && (
                                <div className="flex flex-col gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* What is it */}
                                    <div>
                                        <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Que es</span>
                                        <p className="text-slate-600 leading-relaxed mt-1">{details.what}</p>
                                    </div>

                                    {/* Data provided */}
                                    <div>
                                        <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Datos que ofrece</span>
                                        <div className="flex flex-col gap-2 mt-1.5">
                                            {details.dataProvided.map((item) => {
                                                const Icon = item.icon
                                                return (
                                                    <div key={item.label} className="flex items-start gap-2">
                                                        <div className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <Icon size={11} className="text-violet-600" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-slate-700">{item.label}</span>
                                                            <span className="text-slate-500"> — {item.detail}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* How it works */}
                                    <div>
                                        <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Como conectar</span>
                                        <p className="text-slate-600 leading-relaxed mt-1">{details.howItWorks}</p>
                                    </div>

                                    {/* CRM usage */}
                                    <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-md">
                                        <span className="font-semibold text-violet-700 text-[11px] uppercase tracking-wide">Uso en el CRM</span>
                                        <p className="text-violet-700 leading-relaxed mt-1">{details.crmUsage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                // Fallback for non-data_platform providers (e.g. Octopus)
                return provider.description ? (
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {provider.description}
                    </p>
                ) : null
            })()}

            {/* Error message */}
            {integration?.last_error && integration.status === 'error' && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <span className="font-medium">Error: </span>{integration.last_error}
                </div>
            )}

            {/* Sync toggle (only when active) */}
            {integration?.status === 'active' && (
                <label className="flex items-center justify-between gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <span>Sincronizacion automatica</span>
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
                    Ultimo sync: {new Date(integration.last_sync_at).toLocaleString('es-ES')}
                </p>
            )}

            {/* Fetch data buttons */}
            {(canFetchTariffs || canFetchPrices || canFetchConsumption) && (
                <div className="flex flex-col gap-1.5">
                    <button
                        type="button"
                        disabled={isSyncing}
                        onClick={handleFetchData}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                    >
                        <Download size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing
                            ? 'Sincronizando...'
                            : canFetchTariffs
                                ? 'Sincronizar tarifas'
                                : canFetchPrices
                                    ? 'Importar precios PVPC'
                                    : 'Importar CUPS desde Datadis'}
                    </button>
                    {syncResult && (
                        <p className={`text-xs px-1 ${syncResult.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                            {syncResult}
                        </p>
                    )}
                </div>
            )}

            {/* Datadis consumption info */}
            {canFetchConsumption && (
                <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
                    <span className="font-semibold">Consumos horarios:</span> ve a la ficha de cada cliente para importar y ver datos reales de consumo por CUPS.
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-100 mt-auto">
                {!integration || integration.status === 'inactive' ? (
                    <button
                        type="button"
                        onClick={() => onConnect(provider)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                        style={{
                            background: mode === 'data_platform' ? '#7c3aed' : '#2563eb',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = mode === 'data_platform' ? '#6d28d9' : '#1d4ed8')}
                        onMouseOut={e => (e.currentTarget.style.background = mode === 'data_platform' ? '#7c3aed' : '#2563eb')}
                    >
                        <Plug size={14} />
                        Conectar
                    </button>
                ) : integration.status === 'error' || integration.status === 'expired' ? (
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
                            {confirmDisconnect ? 'Confirmar?' : 'Desconectar'}
                        </button>
                    </>
                ) : (
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
                            {confirmDisconnect ? 'Confirmar?' : 'Desconectar'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
