import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import {
    LayoutDashboard, Users, FileText, Scale, FileSignature,
    HelpCircle, Settings, Wallet, MessageSquare, Building2, Shield, X, CreditCard, Lock
} from 'lucide-react'
import type { PlanFeatures } from '@/shared/types'
import { useTour } from '@/features/guide/useTour'
import { usePlan } from '@/features/billing/hooks/usePlan'
import { PLAN_DISPLAY, PLAN_COLORS } from '@/features/billing/lib/plans'

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { h: 221, s: 83, l: 53 }
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function adjustHexLightness(hex: string, targetL: number): string {
    const { h, s } = hexToHsl(hex)
    return `hsl(${h}, ${s}%, ${targetL}%)`
}

function applyBrandingToCSS(primaryHex: string) {
    const root = document.documentElement
    const { h, s, l } = hexToHsl(primaryHex)

    // Hex tokens for inline styles
    root.style.setProperty('--color-primary', primaryHex)
    root.style.setProperty('--color-primary-hover', adjustHexLightness(primaryHex, Math.max(l - 8, 10)))
    root.style.setProperty('--primary-light', adjustHexLightness(primaryHex, 96))
    root.style.setProperty('--primary-subtle', adjustHexLightness(primaryHex, 90))

    // HSL tokens for Tailwind/Shadcn
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`)
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`)
}

const navItems: {
    id: string
    label: string
    path: string
    icon: typeof LayoutDashboard
    gate?: keyof PlanFeatures
}[] = [
    { id: 'dashboard', label: 'Inicio', path: '/', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM / Clientes', path: '/crm', icon: Users, gate: 'crm' },
    { id: 'tariffs', label: 'Tarifario', path: '/admin/tariffs', icon: FileText },
    { id: 'suppliers', label: 'Comercializadoras', path: '/admin/suppliers', icon: Building2 },
    { id: 'comparator', label: 'Comparador', path: '/comparator', icon: Scale, gate: 'comparator' },
    { id: 'contracts', label: 'Contratos', path: '/contracts', icon: FileSignature },
    { id: 'messaging', label: 'Mensajería', path: '/admin/messages', icon: MessageSquare, gate: 'messaging' },
    { id: 'commissioners', label: 'Comisionados', path: '/commissioners', icon: Wallet, gate: 'commissioners' },
    { id: 'compliance', label: 'Cumplimiento', path: '/admin/compliance', icon: Shield, gate: 'compliance' },
]

interface SidebarProps {
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const location = useLocation()
    const { startTour } = useTour()
    const { tier, canUseFeature } = usePlan()

    const { data: sidebarData } = useQuery({
        queryKey: ['company-branding'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('users')
                .select('company_id, role')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile?.company_id) return null

            const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', profile.company_id)
                .maybeSingle()

            return { company, userRole: profile.role as string | null }
        },
        staleTime: 5 * 60 * 1000,
    })

    const companyData = sidebarData?.company
    const canManageBilling = sidebarData?.userRole === 'admin' || sidebarData?.userRole === 'manager'

    const companyName = companyData?.name || 'Mi Empresa'
    const primaryColor = companyData?.primary_color || '#2563eb'
    const sidebarBg = companyData?.sidebar_color || '#0f172a'

    // Apply branding colors to global CSS variables
    useEffect(() => {
        applyBrandingToCSS(primaryColor)
    }, [primaryColor])

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
                        CRM Energía
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
                        aria-label="Cerrar menú"
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
                overflowY: 'hidden',
            }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path))
                    const Icon = item.icon
                    const isLocked = item.gate ? !canUseFeature(item.gate) : false

                    return (
                        <Link
                            key={item.id}
                            to={isLocked ? '/settings/subscription' : item.path}
                            onClick={handleNavClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.5625rem 0.75rem',
                                borderRadius: '7px',
                                color: isLocked
                                    ? 'rgba(255,255,255,0.2)'
                                    : isActive ? 'white' : 'rgba(255,255,255,0.5)',
                                textDecoration: 'none',
                                fontWeight: isActive && !isLocked ? 600 : 500,
                                fontSize: '0.875rem',
                                letterSpacing: '-0.01em',
                                transition: 'all 0.15s ease',
                                background: isActive && !isLocked
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'transparent',
                                position: 'relative',
                            }}
                            className="sidebar-nav-item"
                        >
                            {/* Active accent bar */}
                            {isActive && !isLocked && (
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
                                    color: isLocked
                                        ? 'rgba(255,255,255,0.2)'
                                        : isActive ? primaryColor : 'inherit',
                                }}
                            />
                            {item.label}
                            {isLocked && (
                                <Lock size={12} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }} />
                            )}
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
                {/* Plan indicator — solo para admin/manager */}
                {canManageBilling && (
                <Link
                    to="/settings/subscription"
                    onClick={handleNavClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '7px',
                        textDecoration: 'none',
                        marginBottom: '2px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 500 }}>Plan</span>
                    </div>
                    <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: PLAN_COLORS[tier].bg,
                        color: PLAN_COLORS[tier].text,
                        border: `1px solid ${PLAN_COLORS[tier].border}`,
                    }}>
                        {PLAN_DISPLAY[tier]}
                    </span>
                </Link>
                )}

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
                    Ayuda y Guía
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
