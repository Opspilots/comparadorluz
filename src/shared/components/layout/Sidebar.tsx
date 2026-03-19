import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import {
    LayoutDashboard, Users, FileText, Scale, FileSignature,
    HelpCircle, Settings, Wallet, MessageSquare, Building2, Shield, X
} from 'lucide-react'
import { useTour } from '@/features/guide/useTour'

const navItems = [
    { id: 'dashboard', label: 'Inicio', path: '/', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM / Clientes', path: '/crm', icon: Users },
    { id: 'tariffs', label: 'Tarifario', path: '/admin/tariffs', icon: FileText },
    { id: 'suppliers', label: 'Comercializadoras', path: '/admin/suppliers', icon: Building2 },
    { id: 'comparator', label: 'Comparador', path: '/comparator', icon: Scale },
    { id: 'contracts', label: 'Contratos', path: '/contracts', icon: FileSignature },
    { id: 'messaging', label: 'Mensajeria', path: '/admin/messages', icon: MessageSquare },
    { id: 'commissioners', label: 'Comisionados', path: '/commissioners', icon: Wallet },
    { id: 'compliance', label: 'Cumplimiento', path: '/admin/compliance', icon: Shield },
]

interface SidebarProps {
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const location = useLocation()
    const { startTour } = useTour()

    const { data: companyData } = useQuery({
        queryKey: ['company-branding'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile?.company_id) return null

            const { data: company } = await supabase
                .from('companies')
                .select('name, logo_url, primary_color, secondary_color, sidebar_color')
                .eq('id', profile.company_id)
                .maybeSingle()

            return company
        },
        staleTime: 5 * 60 * 1000,
    })

    const companyName = companyData?.name || 'Mi Empresa'
    const primaryColor = companyData?.primary_color || '#2563eb'
    const sidebarBg = companyData?.sidebar_color || '#0f172a'

    const handleNavClick = () => {
        if (onMobileClose) onMobileClose()
    }

    const sidebarContent = (
        <aside className="sidebar-aside" style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            backgroundColor: sidebarBg,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
            {/* Company Brand */}
            <div style={{
                padding: '1.25rem 1.25rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                minHeight: 'var(--header-height)',
            }}>
                {companyData?.logo_url ? (
                    <img
                        src={companyData.logo_url}
                        alt={companyName}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 2px 8px ${primaryColor}80`,
                    }}>
                        <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 800 }}>
                            {companyName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                        color: 'white',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {companyName}
                    </span>
                    <div style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginTop: '1px',
                    }}>
                        CRM Energia
                    </div>
                </div>
                {/* Mobile close button */}
                {onMobileClose && (
                    <button
                        onClick={onMobileClose}
                        className="sidebar-mobile-close"
                        style={{
                            display: 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                        aria-label="Cerrar menu"
                    >
                        <X size={18} />
                    </button>
                )}
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
                            onClick={handleNavClick}
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
                                    background: primaryColor,
                                    borderRadius: '0 2px 2px 0',
                                }} />
                            )}
                            <Icon
                                size={17}
                                style={{
                                    flexShrink: 0,
                                    color: isActive ? primaryColor : 'inherit',
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
                    onClick={handleNavClick}
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
                    Ayuda y Guia
                </button>
            </div>
        </aside>
    )

    return (
        <>
            {/* Desktop sidebar - fixed */}
            <div className="sidebar-desktop">
                <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100 }}>
                    {sidebarContent}
                </div>
            </div>

            {/* Mobile sidebar - overlay */}
            {mobileOpen && (
                <div className="sidebar-mobile-overlay" onClick={onMobileClose}>
                    <div
                        className="sidebar-mobile-drawer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    )
}
