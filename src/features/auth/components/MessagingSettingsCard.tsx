import { useState, useEffect } from 'react'
import { MessageSquare, Save, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getCompanySettings, updateCompanySettings, MessagingSettings } from '../lib/settings-service'

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
        resend_api_key: '',
        email_from: '',
        whatsapp_token: '',
        whatsapp_phone_number_id: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
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
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error al guardar la configuración' })
        } finally {
            setSaving(false)
        }
    }

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
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        <Mail size={16} style={{ color: '#9ca3af' }} /> Resend (Email)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>API Key</label>
                            <input
                                type="password"
                                value={settings.resend_api_key || ''}
                                onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                                placeholder="re_123..."
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6' }}
                                onBlur={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={labelStyle}>Email Remitente</label>
                            <input
                                type="email"
                                value={settings.email_from || ''}
                                onChange={(e) => setSettings({ ...settings, email_from: e.target.value })}
                                placeholder="hola@empresa.com"
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6' }}
                                onBlur={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                            />
                        </div>
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
