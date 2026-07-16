import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getCompanySettings, updateCompanySettings, MessagingSettings } from '../lib/settings-service'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { WhatsAppConnectGuide } from './WhatsAppConnectGuide'

// Types for Meta Facebook SDK (loaded dynamically at runtime)
declare global {
    interface Window {
        FB: {
            init: (config: object) => void
            login: (callback: (response: { authResponse?: { code: string } }) => void, options: object) => void
        }
        fbAsyncInit: () => void
    }
}

interface WhatsAppConfig {
    phone_number_id: string
    verified_name: string | null
    display_phone_number: string | null
    quality_rating: string | null
}

export function MessagingSettingsCard() {
    const [settings, setSettings] = useState<MessagingSettings>({
        google_refresh_token: '',
        google_access_token: '',
        email_from: '',
    })
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // WhatsApp state
    const [waConfig, setWaConfig] = useState<WhatsAppConfig | null>(null)
    const [waLoading, setWaLoading] = useState(true)
    const [waConnecting, setWaConnecting] = useState(false)
    const [waDisconnecting, setWaDisconnecting] = useState(false)
    const [waGuideOpen, setWaGuideOpen] = useState(false)
    const [waConnectError, setWaConnectError] = useState<string | null>(null)
    const phoneNumberIdRef = useRef<string>('')
    const wabaIdRef = useRef<string>('')

    useEffect(() => {
        fetchSettings()
        loadWhatsAppConfig()
        loadFacebookSDK()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await fetchSettings()
                await loadWhatsAppConfig()
            }
        })
        return () => {
            subscription.unsubscribe()
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
        }
    }, [])

    const fetchSettings = async () => {
        try {
            const data = await getCompanySettings()
            if (data) setSettings(data)
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    // ── WhatsApp ────────────────────────────────────────────────────────────

    const loadWhatsAppConfig = async () => {
        setWaLoading(true)
        try {
            const { data } = await supabase
                .from('company_whatsapp_config')
                .select('phone_number_id, verified_name, display_phone_number, quality_rating')
                .maybeSingle()
            setWaConfig(data)
        } catch {
            // No config yet — treat as disconnected
        } finally {
            setWaLoading(false)
        }
    }

    const loadFacebookSDK = () => {
        if (document.getElementById('facebook-jssdk')) return
        const script = document.createElement('script')
        script.id = 'facebook-jssdk'
        script.src = 'https://connect.facebook.net/es_ES/sdk.js'
        script.async = true
        script.defer = true
        document.body.appendChild(script)
        window.fbAsyncInit = () => {
            window.FB.init({
                appId: import.meta.env.VITE_META_APP_ID,
                autoLogAppEvents: true,
                xfbml: false,
                version: 'v18.0'
            })
        }
    }

    const handleOpenGuide = () => {
        setWaConnectError(null)
        setWaGuideOpen(true)
    }

    const handleConnectWhatsApp = () => {
        if (!window.FB) {
            setWaConnectError('El SDK de Meta no está cargado. Recarga la página e inténtalo de nuevo.')
            return
        }
        setWaConnecting(true)
        setWaConnectError(null)

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://www.facebook.com') return
            try {
                const data = JSON.parse(event.data as string)
                if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
                    phoneNumberIdRef.current = data.data.phone_number_id ?? ''
                    wabaIdRef.current = data.data.waba_id ?? ''
                }
            } catch {
                // Ignore non-JSON messages from Meta
            }
        }
        window.addEventListener('message', handleMessage)

        window.FB.login(async (response) => {
            window.removeEventListener('message', handleMessage)
            if (!response.authResponse?.code) {
                setWaConnecting(false)
                return
            }
            try {
                const { error: invokeError } = await supabase.functions.invoke('whatsapp-connect', {
                    body: {
                        code: response.authResponse.code,
                        phone_number_id: phoneNumberIdRef.current,
                        waba_id: wabaIdRef.current
                    }
                })
                if (invokeError) throw invokeError
                await loadWhatsAppConfig()
                setWaGuideOpen(false)
                setMessage({ type: 'success', text: 'WhatsApp Business conectado correctamente' })
                if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
                messageTimerRef.current = setTimeout(() => setMessage(null), 4000)
            } catch (e) {
                const err = e as Error
                const errorMsg = err.message || 'Error al conectar WhatsApp'
                setWaConnectError(errorMsg)
                setMessage({ type: 'error', text: errorMsg })
            } finally {
                setWaConnecting(false)
            }
        }, {
            config_id: import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID,
            response_type: 'code',
            override_default_response_type: true,
            extras: { sessionInfoVersion: '3' }
        })
    }

    const handleDisconnectWhatsApp = async () => {
        setWaDisconnecting(true)
        try {
            const { error } = await supabase.functions.invoke('whatsapp-connect', { method: 'DELETE' })
            if (error) throw error
            setWaConfig(null)
            setMessage({ type: 'success', text: 'WhatsApp desconectado correctamente.' })
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
            messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
        } catch (e) {
            const err = e as Error
            setMessage({ type: 'error', text: err.message || 'Error al desconectar WhatsApp' })
        } finally {
            setWaDisconnecting(false)
        }
    }

    // ── Gmail ────────────────────────────────────────────────────────────────

    const handleConnectGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    scopes: 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email',
                    redirectTo: `${window.location.origin}/auth/google/callback?oauth=google`
                }
            })
            if (error) throw error
        } catch (error) {
            console.error('Error connecting with Google:', error)
            setMessage({ type: 'error', text: 'Error al iniciar conexión con Google' })
        }
    }

    const handleDisconnectGoogle = async () => {
        const cleared = { ...settings, google_refresh_token: '', google_access_token: '', email_from: '' }
        setSettings(cleared)
        try {
            await updateCompanySettings(cleared)
            setMessage({ type: 'success', text: 'Cuenta de Gmail desconectada correctamente.' })
            if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
            messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
        } catch (e: unknown) {
            const error = e as Error
            setMessage({ type: 'error', text: error.message || 'Error al desconectar la cuenta' })
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-12 text-[#94a3b8]">
                    <Loader2 className="animate-spin mr-2" size={18} /> Cargando configuraci&oacute;n...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-6 flex flex-col gap-6">
                {/* Email Settings */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[#0f172a] flex items-center gap-2 uppercase tracking-[0.05em]">
                            <Mail size={16} className="text-[#94a3b8]" /> Cuenta de Google (Gmail)
                        </h3>
                        {settings.google_refresh_token ? (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={12} /> Conectada
                            </span>
                        ) : (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle size={12} /> Desconectada
                            </span>
                        )}
                    </div>

                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-6 flex flex-col items-center gap-4 text-center">
                        {settings.google_refresh_token ? (
                            <>
                                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p className="font-medium text-[#0f172a] mb-1">Cuenta vinculada correctamente</p>
                                    <p className="text-sm text-[#64748b]">
                                        {settings.email_from || 'Podrás recibir y enviar correos mediante la API de Gmail.'}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDisconnectGoogle}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    Desconectar
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#2563eb]">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p className="font-medium text-[#0f172a] mb-1">Sincronizaci&oacute;n Bidireccional de Gmail</p>
                                    <p className="text-sm text-[#64748b] max-w-[400px]">
                                        Conecta tu cuenta de Google Workspace o Gmail para enviar y recibir correos directamente desde el CRM.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConnectGoogle}
                                    className="gap-2 bg-[#4285f4] hover:bg-[#3367d6]"
                                >
                                    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Conectar con Google
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#e2e8f0]" />

                {/* WhatsApp Settings */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[#0f172a] flex items-center gap-2 uppercase tracking-[0.05em]">
                            <MessageSquare size={16} className="text-[#94a3b8]" /> WhatsApp Business (Meta)
                        </h3>
                        {!waLoading && (
                            waConfig ? (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Conectado
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle size={12} /> Sin conectar
                                </span>
                            )
                        )}
                    </div>

                    {waLoading ? (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-6 flex items-center justify-center text-[#94a3b8]">
                            <Loader2 className="animate-spin mr-2" size={16} /> Comprobando conexión...
                        </div>
                    ) : waConfig ? (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-6 flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <p className="font-medium text-[#0f172a] mb-1">
                                    {waConfig.verified_name || 'Cuenta vinculada correctamente'}
                                </p>
                                <p className="text-sm text-[#64748b]">
                                    {waConfig.display_phone_number || waConfig.phone_number_id}
                                </p>
                                {waConfig.quality_rating && (
                                    <p className="text-xs text-[#94a3b8] mt-1">
                                        Calidad: {waConfig.quality_rating === 'GREEN' ? 'Alta' : waConfig.quality_rating === 'YELLOW' ? 'Media' : 'Baja'}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDisconnectWhatsApp}
                                disabled={waDisconnecting}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                                {waDisconnecting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                                Desconectar
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-6 flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                                style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                                <MessageSquare size={22} />
                            </div>
                            <div>
                                <p className="font-medium text-[#0f172a] mb-1">Conecta tu WhatsApp Business</p>
                                <p className="text-sm text-[#64748b] max-w-[380px]">
                                    Vincula tu cuenta de WhatsApp Business a través de Meta. Te guiaremos paso a paso — solo toma 2 minutos.
                                </p>
                            </div>
                            <Button
                                onClick={handleOpenGuide}
                                className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
                            >
                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Conectar WhatsApp Business
                            </Button>
                        </div>
                    )}
                </div>

                {/* Message feedback bar */}
                {message && (
                    <>
                        <div className="h-px bg-[#e2e8f0]" />
                        <div className={`text-sm flex items-center gap-2 font-medium ${message.type === 'success' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {message.text}
                        </div>
                    </>
                )}
            </CardContent>

            <WhatsAppConnectGuide
                open={waGuideOpen}
                onOpenChange={setWaGuideOpen}
                onConnect={handleConnectWhatsApp}
                connecting={waConnecting}
                error={waConnectError}
            />
        </Card>
    )
}
