import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

interface LandingHeaderProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const navLinks = [
    { label: 'Método', href: '#metodo' },
    { label: 'Precios', href: '#precios' },
    { label: 'Contacto', href: '#contacto' },
]

export function LandingHeader({ onOpenAuth }: LandingHeaderProps) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled
                    ? 'bg-white/80 backdrop-blur-2xl shadow-lg shadow-black/[0.03] border-b border-black/5'
                    : 'bg-transparent'
            }`}
        >
            <div className="flex items-center justify-between px-[5%] py-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-emerald-500 -rotate-[5deg] shadow-[0_4px_12px_rgba(59,130,246,0.3)]" />
                    <span
                        className={`text-[1.6rem] font-black tracking-[-0.03em] transition-colors duration-500 ${
                            scrolled ? 'text-[#0f172a]' : 'text-white'
                        }`}
                    >
                        EnergyDeal
                    </span>
                </div>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className={`font-medium transition-colors duration-300 ${
                                scrolled
                                    ? 'text-[#0f172a]/70 hover:text-[#0f172a]'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-5">
                    <button
                        onClick={() => onOpenAuth('login')}
                        className={`hidden sm:block bg-transparent border-none font-semibold cursor-pointer transition-colors duration-500 ${
                            scrolled ? 'text-[#0f172a]/80 hover:text-[#0f172a]' : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Acceder
                    </button>
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="hidden sm:block bg-[#2563eb] text-white border-none px-5 py-2.5 rounded-xl font-bold cursor-pointer shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:bg-[#1d4ed8] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)]"
                    >
                        Empezar gratis
                    </button>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={`md:hidden bg-transparent border-none cursor-pointer p-1 ${
                            scrolled ? 'text-[#0f172a]' : 'text-white'
                        }`}
                        aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile slide-down menu */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ${
                    mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                } ${scrolled ? 'bg-white/95 backdrop-blur-xl' : 'bg-[#0f172a]/95 backdrop-blur-xl'}`}
            >
                <nav className="flex flex-col px-[5%] pb-6 pt-2 gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`py-3 font-medium transition-colors duration-300 ${
                                scrolled
                                    ? 'text-[#0f172a]/80 hover:text-[#0f172a]'
                                    : 'text-white/80 hover:text-white'
                            }`}
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-current/10">
                        <button
                            onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false) }}
                            className={`bg-transparent border-none font-semibold cursor-pointer text-left ${
                                scrolled ? 'text-[#0f172a]/80' : 'text-white/80'
                            }`}
                        >
                            Acceder
                        </button>
                        <button
                            onClick={() => { onOpenAuth('signup'); setMobileMenuOpen(false) }}
                            className="bg-[#2563eb] text-white border-none px-5 py-2.5 rounded-xl font-bold cursor-pointer text-center"
                        >
                            Empezar gratis
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    )
}
