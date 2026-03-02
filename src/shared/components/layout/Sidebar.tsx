import { Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, FileText, Scale, FileSignature,
    HelpCircle, Zap, Settings, Wallet, MessageSquare, Building2
} from 'lucide-react'
import { useTour } from '@/features/guide/useTour'

const navItems = [
    { id: 'dashboard', label: 'Inicio', path: '/', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM / Clientes', path: '/crm', icon: Users },
    { id: 'tariffs', label: 'Tarifario', path: '/admin/tariffs', icon: FileText },
    { id: 'suppliers', label: 'Comercializadoras', path: '/admin/suppliers', icon: Building2 },
    { id: 'comparator', label: 'Comparador', path: '/comparator', icon: Scale },
    { id: 'contracts', label: 'Contratos', path: '/contracts', icon: FileSignature },
    { id: 'messaging', label: 'Mensajería', path: '/admin/messages', icon: MessageSquare },
    { id: 'commissioners', label: 'Comisionados', path: '/commissioners', icon: Wallet },
]

export function Sidebar() {
    const location = useLocation()
    const { startTour } = useTour()

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
            {/* Logo */}
            <div style={{
                padding: '1.25rem 1.25rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                minHeight: 'var(--header-height)',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgb(37 99 235 / 0.5)',
                }}>
                    <Zap size={17} color="white" fill="white" />
                </div>
                <div>
                    <span style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.2,
                    }}>
                        EnergyDeal
                    </span>
                    <div style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginTop: '1px',
                    }}>
                        CRM
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{
                flex: 1,
                padding: '0.75rem 0.625rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                overflowY: 'auto',
            }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path))
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.5625rem 0.75rem',
                                borderRadius: '7px',
                                color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                                textDecoration: 'none',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.875rem',
                                letterSpacing: '-0.01em',
                                transition: 'all 0.15s ease',
                                background: isActive
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'transparent',
                                position: 'relative',
                            }}
                            className="sidebar-nav-item"
                        >
                            {/* Active accent bar */}
                            {isActive && (
                                <span style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '3px',
                                    height: '60%',
                                    background: '#3b82f6',
                                    borderRadius: '0 2px 2px 0',
                                }} />
                            )}
                            <Icon
                                size={17}
                                style={{
                                    flexShrink: 0,
                                    color: isActive ? '#60a5fa' : 'inherit',
                                }}
                            />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom section */}
            <div style={{
                padding: '0.625rem',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
            }}>
                <Link
                    to="/settings"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.5625rem 0.75rem',
                        borderRadius: '7px',
                        color: location.pathname === '/settings'
                            ? 'white'
                            : 'rgba(255,255,255,0.45)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: location.pathname === '/settings' ? 600 : 500,
                        background: location.pathname === '/settings'
                            ? 'rgba(255,255,255,0.08)'
                            : 'transparent',
                        transition: 'all 0.15s ease',
                    }}
                    className="sidebar-nav-item"
                >
                    <Settings size={17} style={{ flexShrink: 0 }} />
                    Ajustes
                </Link>

                <button
                    onClick={startTour}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.5625rem 0.75rem',
                        borderRadius: '7px',
                        color: 'rgba(255,255,255,0.35)',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                    }}
                    className="sidebar-nav-item"
                >
                    <HelpCircle size={17} style={{ flexShrink: 0 }} />
                    Ayuda y Guía
                </button>
            </div>
        </aside>
    )
}
