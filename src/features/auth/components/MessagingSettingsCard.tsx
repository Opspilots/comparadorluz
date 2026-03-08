import { useState, useEffect } from 'react'
import { MessageSquare, Save, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getCompanySettings, updateCompanySettings, MessagingSettings } from '../lib/settings-service'
import { supabase } from '@/shared/lib/supabase'

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    transition: 'background 0.15s, border-color 0.15s'
}

const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
}

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

        // Listen for OAuth redirects (Supabase handles the URL hash, we just need to detect when session is updated and check if it came from Google)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
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
            setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
            setTimeout(() => setMessage(null), 3000)
        } catch (e: unknown) {
            const error = e as Error;
            setMessage({ type: 'error', text: error.message || 'Error al guardar la configuración' })
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
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error connecting with Google:', error);
            setMessage({ type: 'error', text: 'Error al iniciar conexión con Google' });
        }
    };

    const handleDisconnectGoogle = async () => {
        const cleared = { ...settings, google_refresh_token: '', google_access_token: '', email_from: '' };
        setSettings(cleared);
        try {
            await updateCompanySettings(cleared);
            setMessage({ type: 'success', text: 'Cuenta de Gmail desconectada correctamente.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: unknown) {
            const error = e as Error;
            setMessage({ type: 'error', text: error.message || 'Error al desconectar la cuenta' });
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#9ca3af' }}>
                <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Cargando configuración...
            </div>
        )
    }

    return (
        <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ padding: '0.75rem', background: '#eff6ff', color: '#2563eb', borderRadius: '0.75rem' }}>
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>Configuración de Mensajería</h2>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Credenciales de API para envíos</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Email Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            <Mail size={16} style={{ color: '#9ca3af' }} /> Cuenta de Google (Gmail)
                        </h3>
                        {settings.google_refresh_token ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '0.25rem 0.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={12} /> Conectada
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '0.25rem 0.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertCircle size={12} /> Desconectada
                            </span>
                        )}
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                        {settings.google_refresh_token ? (
                            <>
                                <div style={{ width: 48, height: 48, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: '0.5rem' }}>
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: '#111827' }}>Cuenta vinculada correctamente</p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                                        {settings.email_from || 'Podrás recibir y enviar correos mediante la API de Gmail.'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                        onClick={handleDisconnectGoogle}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', borderColor: '#fca5a5', color: '#dc2626' }}
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 48, height: 48, background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', marginBottom: '0.5rem' }}>
                                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: '#111827' }}>Sincronización Bidireccional de Gmail</p>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', maxWidth: '400px' }}>
                                        Conecta tu cuenta de Google Workspace o Gmail para enviar y recibir correos directamente desde el CRM.
                                    </p>
                                </div>
                                <button
                                    onClick={handleConnectGoogle}
                                    className="btn btn-primary"
                                    style={{ background: '#4285f4', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#3367d6'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#4285f4'}
                                >
                                    <svg style={{ width: 18, height: 18, fill: 'currentColor' }} viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Conectar con Google
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6' }}></div>

                {/* WhatsApp Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        <MessageSquare size={16} style={{ color: '#9ca3af' }} /> Meta (WhatsApp)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Access Token</label>
                            <input
                                type="password"
                                value={settings.whatsapp_token || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_token: e.target.value })}
                                placeholder="EAAB..."
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6' }}
                                onBlur={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Phone Number ID</label>
                            <input
                                type="text"
                                value={settings.whatsapp_phone_number_id || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                                placeholder="102030..."
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6' }}
                                onBlur={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {message ? (
                        <div style={{
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 500,
                            color: message.type === 'success' ? '#16a34a' : '#dc2626'
                        }}>
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {message.text}
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Los cambios se aplican inmediatamente</span>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary"
                        style={{
                            paddingLeft: '1.5rem',
                            paddingRight: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: saving ? 0.7 : 1,
                            cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}
