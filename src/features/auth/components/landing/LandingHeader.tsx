import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

interface LandingHeaderProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const navLinks = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Precios', href: '#precios' },
    { label: 'Contacto', href: '#contacto' },
]

export function LandingHeader({ onOpenAuth }: LandingHeaderProps) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled
                    ? 'bg-[#050508]/80 backdrop-blur-2xl border-b border-white/[0.04]'
                    : 'bg-transparent'
            }`}
        >
            <div className="flex items-center justify-between px-[5%] py-4 max-w-[1400px] mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 -rotate-[5deg]" />
                    <span className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-white">
                        EnergyDeal
                    </span>
                </div>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-[13px] font-medium text-slate-500 hover:text-slate-200 transition-colors duration-300"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Desktop actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="hidden sm:block bg-transparent border-none text-[13px] font-medium text-slate-400 hover:text-white cursor-pointer transition-colors duration-300"
                    >
                        Acceder
                    </button>
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="hidden sm:block bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.08] hover:border-white/[0.15] px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-300"
                    >
                        Empezar gratis
                    </button>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden bg-transparent border-none cursor-pointer p-1 text-white"
                        aria-label="Menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 bg-[#050508]/95 backdrop-blur-xl ${
                    mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <nav className="flex flex-col px-[5%] pb-6 pt-2 gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className="py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                        <button
                            onClick={() => { onOpenAuth('login'); setMobileOpen(false) }}
                            className="bg-transparent border-none text-sm font-medium text-slate-400 cursor-pointer text-left"
                        >
                            Acceder
                        </button>
                        <button
                            onClick={() => { onOpenAuth('signup'); setMobileOpen(false) }}
                            className="bg-[#2563eb] text-white border-none px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer text-center"
                        >
                            Empezar gratis
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    )
}
