import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { User as AppUser } from '@/shared/types'
import { User, MessageSquare, ShieldAlert } from 'lucide-react'
import { UserProfileCard } from '../components/UserProfileCard'
import { MessagingSettingsCard } from '../components/MessagingSettingsCard'
import { SettingsAccordion } from '../components/SettingsAccordion'

export function SettingsPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<AppUser | any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
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

    if (loading) {
        return (
            <div style={{ animation: 'fadeIn 0.4s ease-out', padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                Cargando...
            </div>
        )
    }

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '56rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1.5rem', paddingBottom: '5rem' }}>
            {/* User Profile Section */}
            <div className="tour-settings-profile">
                <SettingsAccordion
                    title="Perfil de Usuario"
                    description="Información personal y de la cuenta"
                    icon={<User size={20} />}
                    defaultOpen={true}
                >
                    <UserProfileCard user={user} />
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

            {/* Danger Zone Section */}
            <div className="tour-settings-danger">
                <SettingsAccordion
                    title="Zona de Peligro"
                    description="Acciones sensibles y cierre de sesión"
                    icon={<ShieldAlert size={20} style={{ color: '#ef4444' }} />}
                >
                    <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.75rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'rgba(220, 38, 38, 0.8)', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                            Estas acciones afectan a tu sesión actual.
                        </p>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                background: '#ffffff',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                        >
                            <ShieldAlert size={18} />
                            Cerrar Sesión Activa
                        </button>
                    </div>
                </SettingsAccordion>
            </div>
        </div>
    )
}
