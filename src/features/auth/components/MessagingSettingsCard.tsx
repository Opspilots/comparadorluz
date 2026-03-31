import { useState, useEffect } from 'react'
import { MessageSquare, Save, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getCompanySettings, updateCompanySettings, MessagingSettings } from '../lib/settings-service'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function MessagingSettingsCard() {
    const [settings, setSettings] = useState<MessagingSettings>({
        google_refresh_token: '',
        google_access_token: '',
        email_from: '',
        whatsapp_token: '',
        whatsapp_phone_number_id: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await fetchSettings()
            }
        })
        return () => subscription.unsubscribe()
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

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            await updateCompanySettings(settings)
            setMessage({ type: 'success', text: 'Configuracion guardada correctamente' })
            setTimeout(() => setMessage(null), 3000)
        } catch (e: unknown) {
            const error = e as Error
            setMessage({ type: 'error', text: error.message || 'Error al guardar la configuracion' })
        } finally {
            setSaving(false)
        }
    }

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
            setMessage({ type: 'error', text: 'Error al iniciar conexion con Google' })
        }
    }

    const handleDisconnectGoogle = async () => {
        const cleared = { ...settings, google_refresh_token: '', google_access_token: '', email_from: '' }
        setSettings(cleared)
        try {
            await updateCompanySettings(cleared)
            setMessage({ type: 'success', text: 'Cuenta de Gmail desconectada correctamente.' })
            setTimeout(() => setMessage(null), 3000)
        } catch (e: unknown) {
            const error = e as Error
            setMessage({ type: 'error', text: error.message || 'Error al desconectar la cuenta' })
        }
    }

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
                                        {settings.email_from || 'Podras recibir y enviar correos mediante la API de Gmail.'}
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
                    <h3 className="text-xs font-bold text-[#0f172a] flex items-center gap-2 uppercase tracking-[0.05em]">
                        <MessageSquare size={16} className="text-[#94a3b8]" /> Meta (WhatsApp)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#64748b] uppercase tracking-[0.05em]">
                                Access Token
                            </label>
                            <Input
                                type="password"
                                value={settings.whatsapp_token || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_token: e.target.value })}
                                placeholder="EAAB..."
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#64748b] uppercase tracking-[0.05em]">
                                Phone Number ID
                            </label>
                            <Input
                                type="text"
                                value={settings.whatsapp_phone_number_id || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                                placeholder="102030..."
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#e2e8f0]" />

                {/* Action Bar */}
                <div className="flex items-center justify-between">
                    {message ? (
                        <div className={`text-sm flex items-center gap-2 font-medium ${message.type === 'success' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {message.text}
                        </div>
                    ) : (
                        <span className="text-xs text-[#94a3b8]">Los cambios se aplican inmediatamente</span>
                    )}

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
