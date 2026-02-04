import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

export function Header() {
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUserName(data.user.email?.split('@')[0] || 'Usuario')
            }
        })
    }, [])

    return (
        <header style={{
            height: 'var(--header-height)',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 90
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    style={{ background: 'var(--background)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Notificaciones"
                >
                    🔔
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrador</div>
                    </div>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.875rem'
                    }}>
                        {userName?.[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    )
}
