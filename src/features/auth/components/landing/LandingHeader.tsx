import { useEffect, useState } from 'react'

interface LandingHeaderProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function LandingHeader({ onOpenAuth }: LandingHeaderProps) {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] py-4 transition-all duration-500 ${
                scrolled
                    ? 'bg-white/80 backdrop-blur-2xl shadow-lg shadow-black/[0.03] border-b border-black/5'
                    : 'bg-transparent'
            }`}
        >
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

            <div className="flex items-center gap-5">
                <button
                    onClick={() => onOpenAuth('login')}
                    className={`bg-transparent border-none font-semibold cursor-pointer transition-colors duration-500 ${
                        scrolled ? 'text-[#0f172a]/80 hover:text-[#0f172a]' : 'text-white/80 hover:text-white'
                    }`}
                >
                    Acceder
                </button>
                <button
                    onClick={() => onOpenAuth('signup')}
                    className="bg-[#2563eb] text-white border-none px-5 py-2.5 rounded-xl font-bold cursor-pointer shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:bg-[#1d4ed8] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)]"
                >
                    Empezar gratis
                </button>
            </div>
        </header>
    )
}
