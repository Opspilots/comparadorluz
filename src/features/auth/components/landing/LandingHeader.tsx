import { useEffect, useRef, useState } from 'react'
import { Menu, X, Zap, ArrowRight } from 'lucide-react'

interface LandingHeaderProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const navLinks = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Integraciones', href: '#integraciones' },
    { label: 'Precios', href: '#precios' },
    { label: 'Blog', href: '#blog' },
    { label: 'Contacto', href: '#contacto' },
]

export function LandingHeader({ onOpenAuth }: LandingHeaderProps) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    // Expose header height as CSS variable for hero section offset
    useEffect(() => {
        const update = () => {
            if (headerRef.current) {
                const h = headerRef.current.offsetHeight
                document.documentElement.style.setProperty('--header-h', `${h}px`)
            }
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    return (
        <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
            <header
                className="transition-all duration-300"
                style={{
                    background: scrolled
                        ? 'rgba(3,5,20,0.92)'
                        : 'rgba(3,5,20,0.75)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: scrolled
                        ? '1px solid rgba(255,255,255,0.07)'
                        : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: scrolled
                        ? '0 4px 32px rgba(0,0,0,0.4)'
                        : 'none',
                }}
            >
                <div className="flex items-center justify-between px-6 lg:px-[5%] h-16 max-w-[1400px] mx-auto">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                boxShadow: '0 0 14px rgba(37,99,235,0.5)',
                            }}
                        >
                            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="currentColor" />
                        </div>
                        <span className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-white">
                            Energy<span className="text-blue-400">Deal</span>
                        </span>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden xl:flex items-center gap-0.5">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-3.5 py-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.05]"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onOpenAuth('login')}
                            className="hidden md:block px-4 py-2 rounded-lg bg-transparent border-none text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] cursor-pointer transition-all duration-200"
                        >
                            Acceder
                        </button>
                        <button
                            onClick={() => onOpenAuth('signup')}
                            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer text-white border-none transition-all duration-200 hover:opacity-90"
                            style={{
                                background: '#2563eb',
                                boxShadow: '0 0 20px rgba(37,99,235,0.35)',
                            }}
                        >
                            Empezar gratis
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>

                        {/* Mobile toggle */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="xl:hidden bg-transparent border-none cursor-pointer p-1.5 text-slate-300 rounded-lg hover:bg-white/[0.06] transition-colors ml-1"
                            aria-label="Menú"
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div
                    className={`xl:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'}`}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <nav className="flex flex-col px-6 pb-6 pt-3 gap-0.5">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors border-b border-white/[0.04] last:border-0"
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button
                                onClick={() => { onOpenAuth('login'); setMobileOpen(false) }}
                                className="border border-white/[0.08] text-sm font-medium text-slate-400 cursor-pointer py-2.5 rounded-lg hover:text-white hover:bg-white/[0.04] transition-all bg-transparent"
                            >
                                Acceder
                            </button>
                            <button
                                onClick={() => { onOpenAuth('signup'); setMobileOpen(false) }}
                                className="text-white border-none px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer text-center"
                                style={{ background: '#2563eb' }}
                            >
                                Empezar gratis
                            </button>
                        </div>
                    </nav>
                </div>
            </header>
        </div>
    )
}
