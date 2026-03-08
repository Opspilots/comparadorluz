import { useState, useEffect } from 'react'
import { Key, User, Lock, Hash, ExternalLink } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import type { Integration, IntegrationProvider } from '@/shared/types'
import { useConnectIntegration } from '../lib/useIntegrations'

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
    const [validationError, setValidationError] = useState<string | null>(null)

    const connect = useConnectIntegration(companyId)

    // Reset form when provider changes
    useEffect(() => {
        setApiKey('')
        setUsername('')
        setPassword('')
        setAgentCode('')
        setValidationError(null)
    }, [provider])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!provider) return

        setValidationError(null)

        // Validate required fields per auth_type
        if (provider.auth_type === 'api_key' && !apiKey.trim()) {
            setValidationError('La API Key es obligatoria')
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
        }

        const agentConfig: Integration['agent_config'] = {}
        if (agentCode.trim()) agentConfig.agent_code = agentCode.trim()

        try {
            await connect.mutateAsync({ providerId: provider.id, credentials, agentConfig })
            onClose()
        } catch (err) {
            setValidationError(err instanceof Error ? err.message : 'Error al conectar la integración')
        }
    }

    const isOpen = !!provider

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        Conectar con {provider?.display_name ?? ''}
                    </DialogTitle>
                </DialogHeader>

                {provider?.auth_type === 'oauth2' ? (
                    <div className="flex flex-col gap-5 mt-2">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            La conexión OAuth2 con <strong>{provider.display_name}</strong> estará
                            disponible próximamente. Ponte en contacto con soporte para activarla.
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                Código de agente <span className="text-slate-400 font-normal">(opcional)</span>
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

                        {provider.docs_url && (
                            <a
                                href={provider.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink size={13} />
                                Ver documentación de la API
                            </a>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="button" disabled>
                                Próximamente
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                        {validationError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                                {validationError}
                            </div>
                        )}

                        {provider?.auth_type === 'api_key' && (
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                    API Key <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="sk-…"
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
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-slate-700">
                                Código de agente <span className="text-slate-400 font-normal">(opcional)</span>
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

                        {provider?.docs_url && (
                            <a
                                href={provider.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink size={13} />
                                Ver documentación de la API
                            </a>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={connect.isPending}>
                                {connect.isPending ? 'Conectando…' : 'Guardar conexión'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
