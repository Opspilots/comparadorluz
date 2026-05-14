import { useEffect, useState } from 'react'
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
    const [announcementVisible, setAnnouncementVisible] = useState(true)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            {/* Announcement strip */}
            {announcementVisible && !scrolled && (
                <div
                    className="relative flex items-center justify-center gap-3 px-4 py-2 text-center"
                    style={{ background: 'rgba(37,99,235,0.12)', borderBottom: '1px solid rgba(37,99,235,0.15)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-400 tracking-[0.1em] uppercase bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/20">Nuevo</span>
                        <span className="text-[12px] text-slate-400">
                            OCR de facturas con IA — detecta CUPS y consumo automáticamente
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" strokeWidth={2.5} />
                    </div>
                    <button
                        onClick={() => setAnnouncementVisible(false)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors bg-transparent border-none cursor-pointer p-0.5"
                        aria-label="Cerrar"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <header
                className={`transition-all duration-500 ${
                    scrolled ? 'border-b border-white/[0.05]' : 'bg-transparent'
                }`}
                style={
                    scrolled
                        ? {
                              background: 'rgba(2,2,9,0.9)',
                              backdropFilter: 'blur(24px)',
                              boxShadow: '0 1px 0 rgba(37,99,235,0.08), 0 4px 32px rgba(0,0,0,0.3)',
                          }
                        : undefined
                }
            >
                <div className="flex items-center justify-between px-[5%] py-[18px] max-w-[1400px] mx-auto">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div
                            className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                boxShadow: '0 0 16px rgba(37,99,235,0.4)',
                            }}
                        >
                            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="currentColor" />
                        </div>
                        <span className="text-[1.25rem] font-extrabold tracking-[-0.03em] text-white">
                            Energy<span style={{ color: '#60a5fa' }}>Deal</span>
                        </span>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden xl:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="relative px-3.5 py-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.04] group"
                            >
                                {link.label}
                                <span className="absolute bottom-1 left-3.5 right-3.5 h-px bg-blue-400/0 group-hover:bg-blue-400/40 transition-all duration-300 rounded-full" />
                            </a>
                        ))}
                    </nav>

                    {/* Desktop actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onOpenAuth('login')}
                            className="hidden md:block px-4 py-2 rounded-lg bg-transparent border-none text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] cursor-pointer transition-all duration-200"
                        >
                            Acceder
                        </button>
                        <button
                            onClick={() => onOpenAuth('signup')}
                            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-300 text-white border-none landing-glow-blue"
                            style={{ background: '#2563eb' }}
                        >
                            Empezar gratis
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>

                        {/* Mobile toggle */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="xl:hidden bg-transparent border-none cursor-pointer p-1.5 text-white rounded-lg hover:bg-white/[0.06] transition-colors ml-1"
                            aria-label="Menú"
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div
                    className={`xl:hidden overflow-hidden transition-all duration-300 border-b border-white/[0.04] ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                    style={{ background: 'rgba(2,2,9,0.98)', backdropFilter: 'blur(24px)' }}
                >
                    <nav className="flex flex-col px-[5%] pb-6 pt-2 gap-0.5">
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
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                            <button
                                onClick={() => { onOpenAuth('login'); setMobileOpen(false) }}
                                className="bg-transparent border border-white/[0.08] text-sm font-medium text-slate-400 cursor-pointer py-2.5 rounded-lg hover:text-white hover:bg-white/[0.04] transition-all"
                            >
                                Acceder
                            </button>
                            <button
                                onClick={() => { onOpenAuth('signup'); setMobileOpen(false) }}
                                className="text-white border-none px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer text-center landing-glow-blue"
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
