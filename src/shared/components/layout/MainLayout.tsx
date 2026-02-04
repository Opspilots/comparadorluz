import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

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
                <Header />
                <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
