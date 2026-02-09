import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { User, LogOut, Mail, Calendar } from 'lucide-react'

export function SettingsPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<any>(null)
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
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2.25rem', marginBottom: '2.5rem' }}>Ajustes</h1>
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    Cargando...
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
                {/* User Information Card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ padding: '0.75rem', background: '#f0f0f0', borderRadius: '12px' }}>
                            <User size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Información de Usuario</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <Mail size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Correo Electrónico</div>
                                <div style={{ fontWeight: 500 }}>{user?.email || 'No disponible'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <User size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ID de Usuario</div>
                                <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>{user?.id || 'No disponible'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <Calendar size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fecha de Registro</div>
                                <div style={{ fontWeight: 500 }}>
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'No disponible'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Card */}
                <div className="card" style={{ background: '#0a0a0a', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                            <LogOut size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>Sesión</h2>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
                        Cierra tu sesión actual de forma segura. Tendrás que volver a iniciar sesión para acceder a la aplicación.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="btn"
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            background: 'white',
                            color: '#0a0a0a',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            fontSize: '1rem'
                        }}
                    >
                        <LogOut size={20} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    )
}
