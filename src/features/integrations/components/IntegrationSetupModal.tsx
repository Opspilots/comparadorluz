import { useState, useEffect } from 'react'
import { Key, User, Lock, Hash, ExternalLink, Info, BarChart3, Activity, FileText, CheckCircle2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import type { Integration, IntegrationProvider } from '@/shared/types'
import { useConnectIntegration } from '../lib/useIntegrations'

// Provider-specific hints for the setup form
const PROVIDER_HINTS: Record<string, {
    credentialLabel?: string
    placeholder?: string
    helpText?: string
    detailedDescription?: string
    dataYouGet?: Array<{ icon: typeof BarChart3; text: string }>
    howToConnect?: string[]
    crmBenefit?: string
}> = {
    'datadis': {
        credentialLabel: 'NIF/CIF autorizado',
        placeholder: 'B12345678',
        helpText: 'Datadis es la plataforma oficial de las distribuidoras electricas. Centraliza los datos de consumo de todos los puntos de suministro en España.',
        detailedDescription: 'Al conectar Datadis, podras importar los consumos reales de cualquier CUPS asociado a tu NIF, sin importar que comercializadora tenga contratada el cliente.',
        dataYouGet: [
            { icon: BarChart3, text: 'Consumos horarios reales (kWh por hora y periodo P1/P2/P3)' },
            { icon: Activity, text: 'Potencia maxima demandada en cada periodo' },
            { icon: FileText, text: 'Datos del contrato actual: comercializadora, potencia, tarifa' },
        ],
        howToConnect: [
            'Registrate gratis en datadis.es con el NIF/CIF de tu empresa',
            'Autoriza los CUPS que quieras consultar desde el panel de Datadis',
            'Introduce aqui tu usuario y contraseña de datadis.es',
        ],
        crmBenefit: 'El comparador usara consumos reales hora a hora en lugar de estimaciones, generando propuestas mucho mas precisas para tus clientes.',
    },
    'ree-esios': {
        credentialLabel: 'Token personal e-sios',
        placeholder: 'Tu token de e-sios...',
        helpText: 'e-sios es el sistema de informacion de Red Electrica (REE). Publica los precios oficiales del mercado electrico en tiempo real.',
        detailedDescription: 'Con esta conexion, el CRM importa automaticamente los precios PVPC y del mercado spot para alimentar el comparador y mostrar la evolucion de precios.',
        dataYouGet: [
            { icon: BarChart3, text: 'Precios PVPC horarios (tarifa regulada, actualizados diariamente)' },
            { icon: Activity, text: 'Precio pool/spot del mercado mayorista' },
            { icon: FileText, text: 'Mas de 1.400 indicadores: peajes, costes regulados, restricciones' },
        ],
        howToConnect: [
            'Envia un email a consultasios@ree.es solicitando acceso a la API',
            'Indica tu nombre, empresa y uso (comparador energetico)',
            'Recibiras un token personal gratuito en 1-2 dias laborables',
            'Introduce el token aqui para activar la conexion',
        ],
        crmBenefit: 'Los precios PVPC sirven como referencia al comparar tarifas reguladas vs. mercado libre. Los precios pool permiten calcular costes reales de tarifas indexadas.',
    },
    'octopus': {
        helpText: 'API publica que no requiere credenciales. Consulta tarifas y precios en tiempo real de Octopus Energy.',
    },
}

interface IntegrationSetupModalProps {
    provider: IntegrationProvider | null
    companyId: string
    existingIntegration?: Integration
    onClose: () => void
}

export function IntegrationSetupModal({
    provider,
    companyId,
    onClose,
}: IntegrationSetupModalProps) {
    const [apiKey, setApiKey] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [agentCode, setAgentCode] = useState('')
    const [nif, setNif] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    const connect = useConnectIntegration(companyId)

    // Reset form when provider changes
    useEffect(() => {
        setApiKey('')
        setUsername('')
        setPassword('')
        setAgentCode('')
        setNif('')
        setValidationError(null)
    }, [provider])

    const hints = provider ? PROVIDER_HINTS[provider.slug] : undefined

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!provider) return

        setValidationError(null)

        // Validate required fields per auth_type
        if (provider.auth_type === 'api_key' && !apiKey.trim()) {
            setValidationError(hints?.credentialLabel
                ? `${hints.credentialLabel} es obligatorio`
                : 'La API Key es obligatoria')
            return
        }
        if (provider.auth_type === 'basic_auth') {
            if (!username.trim()) { setValidationError('El usuario es obligatorio'); return }
            if (!password.trim()) { setValidationError('La contraseña es obligatoria'); return }
        }

        const credentials: Record<string, string> = {}
        if (provider.auth_type === 'api_key') credentials.api_key = apiKey.trim()
        if (provider.auth_type === 'basic_auth') {
            credentials.username = username.trim()
            credentials.password = password.trim()
            if (nif.trim()) credentials.nif = nif.trim()
        }

        const agentConfig: Integration['agent_config'] = {}
        if (agentCode.trim()) agentConfig.agent_code = agentCode.trim()

        try {
            await connect.mutateAsync({ providerId: provider.id, credentials, agentConfig })
            onClose()
        } catch (err) {
            setValidationError(err instanceof Error ? err.message : 'Error al conectar la integracion')
        }
    }

    const handlePublicConnect = async () => {
        if (!provider) return
        try {
            const agentConfig: Integration['agent_config'] = {}
            if (agentCode.trim()) agentConfig.agent_code = agentCode.trim()
            await connect.mutateAsync({ providerId: provider.id, credentials: {}, agentConfig })
            onClose()
        } catch (err) {
            setValidationError(err instanceof Error ? err.message : 'Error al conectar')
        }
    }

    const isOpen = !!provider

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        Conectar con {provider?.display_name ?? ''}
                    </DialogTitle>
                </DialogHeader>

                {provider?.auth_type === 'none' ? (
                    /* ---- Public API (no auth) ---- */
                    <div className="flex flex-col gap-4 mt-2">
                        {/* Main description */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2.5">
                            <Info size={16} className="flex-shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <span>{hints?.helpText ?? `${provider.display_name} ofrece una API publica que no requiere credenciales.`}</span>
                                {hints?.detailedDescription && (
                                    <span className="text-blue-700/80 text-xs">{hints.detailedDescription}</span>
                                )}
                            </div>
                        </div>

                        {/* Data you get */}
                        {hints?.dataYouGet && hints.dataYouGet.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Datos que obtendras</span>
                                <div className="flex flex-col gap-1.5">
                                    {hints.dataYouGet.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <div key={item.text} className="flex items-start gap-2 text-xs text-slate-600">
                                                <div className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Icon size={11} className="text-violet-600" />
                                                </div>
                                                <span>{item.text}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* How to connect steps */}
                        {hints?.howToConnect && hints.howToConnect.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Como conectar</span>
                                <div className="flex flex-col gap-1.5">
                                    {hints.howToConnect.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-600">{i + 1}</span>
                                            <span className="pt-0.5">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CRM benefit */}
                        {hints?.crmBenefit && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                                <div>
                                    <span className="font-semibold">Uso en el CRM: </span>
                                    <span>{hints.crmBenefit}</span>
                                </div>
                            </div>
                        )}

                        {provider.slug === 'octopus' && (
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                    Codigo de agente <span className="text-slate-400 font-normal">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={agentCode}
                                        onChange={e => setAgentCode(e.target.value)}
                                        placeholder="Ej: AGT-12345"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {provider.docs_url && (
                            <a
                                href={provider.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink size={13} />
                                Ver documentacion de la API
                            </a>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={connect.isPending}
                                onClick={handlePublicConnect}
                            >
                                {connect.isPending ? 'Conectando...' : 'Conectar ahora'}
                            </Button>
                        </div>

                        {validationError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                                {validationError}
                            </div>
                        )}
                    </div>
                ) : provider?.auth_type === 'oauth2' ? (
                    /* ---- OAuth2 (not yet implemented) ---- */
                    <div className="flex flex-col gap-5 mt-2">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            La conexion OAuth2 con <strong>{provider.display_name}</strong> estara
                            disponible proximamente.
                        </div>

                        {provider.docs_url && (
                            <a
                                href={provider.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink size={13} />
                                Ver documentacion de la API
                            </a>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="button" disabled>
                                Proximamente
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* ---- API Key or Basic Auth ---- */
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                        {/* Provider-specific help text */}
                        {hints?.helpText && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                                <Info size={14} className="flex-shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                    <span>{hints.helpText}</span>
                                    {hints.detailedDescription && (
                                        <span className="text-blue-700/80 text-xs">{hints.detailedDescription}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Data you get */}
                        {hints?.dataYouGet && hints.dataYouGet.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Datos que obtendras</span>
                                <div className="flex flex-col gap-1.5">
                                    {hints.dataYouGet.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <div key={item.text} className="flex items-start gap-2 text-xs text-slate-600">
                                                <div className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Icon size={11} className="text-violet-600" />
                                                </div>
                                                <span>{item.text}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* How to connect steps */}
                        {hints?.howToConnect && hints.howToConnect.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Pasos para conectar</span>
                                <div className="flex flex-col gap-1.5">
                                    {hints.howToConnect.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-600">{i + 1}</span>
                                            <span className="pt-0.5">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CRM benefit */}
                        {hints?.crmBenefit && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                                <div>
                                    <span className="font-semibold">Uso en el CRM: </span>
                                    <span>{hints.crmBenefit}</span>
                                </div>
                            </div>
                        )}

                        {validationError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                                {validationError}
                            </div>
                        )}

                        {provider?.auth_type === 'api_key' && (
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                    {hints?.credentialLabel ?? 'API Key'} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder={hints?.placeholder ?? 'sk-...'}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {provider?.auth_type === 'basic_auth' && (
                            <>
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                        Usuario <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="usuario@empresa.com"
                                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                        Contraseña <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                {/* NIF field for Datadis */}
                                {provider.slug === 'datadis' && (
                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                            NIF/CIF autorizado <span className="text-slate-400 font-normal">(opcional)</span>
                                        </label>
                                        <div className="relative">
                                            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={nif}
                                                onChange={e => setNif(e.target.value)}
                                                placeholder="B12345678"
                                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Si es diferente al usuario. NIF del titular autorizado para consultar CUPS.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Agent code for energy providers */}
                        {provider?.integration_mode === 'api' && provider.slug !== 'ree-esios' && (
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                    Codigo de agente <span className="text-slate-400 font-normal">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={agentCode}
                                        onChange={e => setAgentCode(e.target.value)}
                                        placeholder="Ej: AGT-12345"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {provider?.docs_url && (
                            <a
                                href={provider.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink size={13} />
                                Ver documentacion de la API
                            </a>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={connect.isPending}>
                                {connect.isPending ? 'Conectando...' : 'Guardar conexion'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
