import React from 'react'
import { Sidebar } from './Sidebar'

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
