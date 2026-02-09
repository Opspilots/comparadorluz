import React from 'react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '@/shared/components/notifications/NotificationBell'

interface MainLayoutProps {
    children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: 'var(--sidebar-width)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: 'white',
                    borderBottom: '1px solid var(--border)',
                    padding: '0.75rem 2rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                }}>
                    <NotificationBell />
                </header>
                <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
