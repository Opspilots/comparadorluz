import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'

interface MainLayoutProps {
    children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
            <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />
            <div className="main-content-wrapper" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
            }}>
                {/* Mobile top bar */}
                <header className="mobile-topbar">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--surface)',
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                            boxShadow: 'var(--shadow-xs)',
                        }}
                        aria-label="Abrir menu"
                    >
                        <Menu size={20} />
                    </button>
                    <span style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.02em',
                    }}>
                        EnergyDeal
                    </span>
                    <div style={{ width: '40px' }} />
                </header>

                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
