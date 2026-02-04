import { Link, useLocation } from 'react-router-dom'

const navItems = [
    { id: 'dashboard', label: 'Inicio', path: '/', icon: '🏠' },
    { id: 'crm', label: 'CRM / Clientes', path: '/crm', icon: '👥' },
    { id: 'tariffs', label: 'Tarifario', path: '/tariffs', icon: '📄' },
    { id: 'comparator', label: 'Comparador', path: '/comparator', icon: '⚖️' },
    { id: 'contracts', label: 'Contratos', path: '/contracts', icon: '📝' },
]

export function Sidebar() {
    const location = useLocation()

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
                    <span style={{ fontSize: '1.5rem' }}>⚡</span> EnergyDeal
                </h1>
            </div>

            <nav style={{ flex: 1, padding: '1.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Soporte</div>
                <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>❔</span> Ayuda y Guía
                </a>
            </div>
        </aside>
    )
}
