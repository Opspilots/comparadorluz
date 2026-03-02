import React from 'react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '@/shared/components/notifications/NotificationBell'

interface MainLayoutProps {
    children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: 'var(--sidebar-width)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
            }}>
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    height: 'var(--header-height)',
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border)',
                    padding: '0 1.75rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <NotificationBell />
                </header>
                <main style={{
                    flex: 1,
                    padding: '2rem 2rem',
                    maxWidth: '1440px',
                    width: '100%',
                    margin: '0 auto',
                }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
