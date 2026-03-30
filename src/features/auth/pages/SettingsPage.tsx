import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { User as AppUser } from '@/shared/types'
import { User, MessageSquare, ShieldAlert, Mail, Calendar, KeyRound, LogOut } from 'lucide-react'
import { BrandingSettingsCard } from '../components/BrandingSettingsCard'
import { MessagingSettingsCard } from '../components/MessagingSettingsCard'
import { SettingsAccordion } from '../components/SettingsAccordion'

export function SettingsPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<AppUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [changingPassword, setChangingPassword] = useState(false)
    const [passwordSent, setPasswordSent] = useState(false)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return

            const { data: profileUser, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle()

            if (profileError) throw profileError
            setUser(profileUser as AppUser)
        } catch (error) {
            console.error('Error fetching user:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleChangePassword = async () => {
        if (!user?.email) return
        setChangingPassword(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/settings`,
            })
            if (error) throw error
            setPasswordSent(true)
            setTimeout(() => setPasswordSent(false), 5000)
        } catch (error) {
            console.error('Error sending password reset:', error)
        } finally {
            setChangingPassword(false)
        }
    }

    if (loading) {
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-out', padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                Cargando...
            </div>
        )
    }

    if (!user) {
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-out', padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                No se pudo cargar el perfil de usuario.
            </div>
        )
    }

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '56rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1.5rem', paddingBottom: '5rem' }}>
            {/* Mi Cuenta — Profile + Branding combined */}
            <div className="tour-settings-profile">
                <SettingsAccordion
                    title="Mi Cuenta"
                    description="Perfil, empresa y personalización de marca"
                    icon={<User size={20} />}
                    defaultOpen={true}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Profile info */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                Perfil de Usuario
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', borderRadius: 10,
                                    background: 'var(--color-background)', border: '1px solid var(--color-border)',
                                }}>
                                    <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Correo</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</div>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', borderRadius: 10,
                                    background: 'var(--color-background)', border: '1px solid var(--color-border)',
                                }}>
                                    <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registro</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: 'var(--color-border)' }} />

                        {/* Branding */}
                        <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                Marca y Colores
                            </h4>
                            <BrandingSettingsCard />
                        </div>
                    </div>
                </SettingsAccordion>
            </div>

            {/* Messaging Configuration Section */}
            <div className="tour-settings-messaging">
                <SettingsAccordion
                    title="Configuración de Mensajería"
                    description="Conexiones con proveedores de Email y WhatsApp"
                    icon={<MessageSquare size={20} />}
                >
                    <MessagingSettingsCard />
                </SettingsAccordion>
            </div>

            {/* Danger Zone — Only logout and change password */}
            <div className="tour-settings-danger">
                <SettingsAccordion
                    title="Zona de Peligro"
                    description="Contraseña y cierre de sesión"
                    icon={<ShieldAlert size={20} style={{ color: '#ef4444' }} />}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Change Password */}
                        <div style={{
                            padding: '1rem', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <KeyRound size={18} style={{ color: 'var(--text-muted)' }} />
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Cambiar Contraseña</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Se enviará un enlace de restablecimiento a tu email
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={changingPassword || passwordSent}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: 8,
                                    background: passwordSent ? '#dcfce7' : '#fff',
                                    border: `1px solid ${passwordSent ? '#bbf7d0' : '#e2e8f0'}`,
                                    color: passwordSent ? '#15803d' : 'var(--text-main)',
                                    fontSize: '0.8125rem', fontWeight: 600, cursor: changingPassword || passwordSent ? 'default' : 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {changingPassword ? 'Enviando...' : passwordSent ? 'Enlace enviado' : 'Enviar enlace'}
                            </button>
                        </div>

                        {/* Logout */}
                        <div style={{
                            padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <LogOut size={18} style={{ color: '#dc2626' }} />
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991b1b' }}>Cerrar Sesión</div>
                                    <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                                        Se cerrará tu sesión activa en este dispositivo
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: 8,
                                    background: '#fff', border: '1px solid #fecaca',
                                    color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </SettingsAccordion>
            </div>
        </div>
    )
}
