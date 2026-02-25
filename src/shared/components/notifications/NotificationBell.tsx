import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    created_at: string
    metadata: Record<string, unknown> | null
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showDropdown, setShowDropdown] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchNotifications()

        // Suscripción a cambios en tiempo real
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}` },
                () => fetchNotifications()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            if (data && !error) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.read).length)
            }
        } catch (err) {
            // Silently fail if notifications table doesn't exist yet
            console.warn('Notifications table not available')
        }
    }

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        fetchNotifications()
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false)

        fetchNotifications()
    }

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id)
        if (notification.link) {
            navigate(notification.link)
            setShowDropdown(false)
        }
    }

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.notification-bell-container')) {
                setShowDropdown(false)
            }
        }

        if (showDropdown) {
            document.addEventListener('click', handleClickOutside)
        }

        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [showDropdown])

    return (
        <div className="notification-bell-container" style={{ position: 'relative' }}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    position: 'relative',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Notificaciones"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ff4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    width: '400px',
                    maxHeight: '500px',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    marginTop: '0.5rem',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#fafafa'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                            Notificaciones
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 500
                                }}
                            >
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p style={{ margin: 0 }}>No hay notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    style={{
                                        padding: '1rem 1.25rem',
                                        borderBottom: '1px solid var(--border-light)',
                                        cursor: notif.link ? 'pointer' : 'default',
                                        background: notif.read ? 'white' : '#f0f7ff',
                                        transition: 'background 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (notif.link) {
                                            e.currentTarget.style.background = notif.read ? '#f8f9fa' : '#e3f2ff'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = notif.read ? 'white' : '#f0f7ff'
                                    }}
                                >
                                    {!notif.read && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '0.5rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--primary)'
                                        }} />
                                    )}
                                    <div style={{
                                        fontWeight: notif.read ? 'normal' : '600',
                                        marginBottom: '0.25rem',
                                        fontSize: '0.9375rem',
                                        paddingLeft: notif.read ? '0' : '1rem'
                                    }}>
                                        {notif.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: '1.4',
                                        paddingLeft: notif.read ? '0' : '1rem'
                                    }}>
                                        {notif.message}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        marginTop: '0.5rem',
                                        paddingLeft: notif.read ? '0' : '1rem'
                                    }}>
                                        {new Date(notif.created_at).toLocaleString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
