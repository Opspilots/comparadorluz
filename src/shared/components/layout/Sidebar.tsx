import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Scale, FileSignature, HelpCircle, Zap, Settings, Wallet, MessageSquare } from 'lucide-react'
import { useTour } from '@/features/guide/useTour'


const navItems = [
    { id: 'dashboard', label: 'Inicio', path: '/', icon: <LayoutDashboard size={20} /> },
    { id: 'crm', label: 'CRM / Clientes', path: '/crm', icon: <Users size={20} /> },
    { id: 'tariffs', label: 'Tarifario', path: '/admin/tariffs', icon: <FileText size={20} /> },
    { id: 'comparator', label: 'Comparador', path: '/comparator', icon: <Scale size={20} /> },
    { id: 'contracts', label: 'Contratos', path: '/contracts', icon: <FileSignature size={20} /> },
    { id: 'messaging', label: 'Mensajería', path: '/admin/messages', icon: <MessageSquare size={20} /> },
    { id: 'commissioners', label: 'Comisionados', path: '/commissioners', icon: <Wallet size={20} /> },
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
            backgroundColor: 'var(--text-main)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100
        }}>
            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h1 style={{ color: 'white', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Zap size={24} fill="currentColor" /> EnergyDeal
                </h1>
            </div>

            <nav className="sidebar-nav" style={{ flex: 1, padding: '1.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                color: isActive ? 'white' : '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: 500,
                                fontSize: '0.925rem',
                                transition: 'all 0.2s',
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            }}
                            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <Link
                        to="/settings"
                        style={{
                            color: location.pathname === '/settings' ? 'white' : '#94a3b8',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            backgroundColor: location.pathname === '/settings' ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                    >
                        <Settings size={18} /> Ajustes
                    </Link>

                </div>
                <button
                    onClick={startTour}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                    <HelpCircle size={18} /> Ayuda y Guía
                </button>
            </div>
        </aside>
    )
}
