import { useEffect, useState } from 'react'
import { Search, Users, FileSignature, MessageSquare } from 'lucide-react'

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const capabilities = [
    { icon: Search, label: 'Comparador', desc: 'Todas las tarifas del mercado' },
    { icon: Users, label: 'CRM', desc: 'Clientes y suministros' },
    { icon: FileSignature, label: 'Contratos', desc: 'Firma y seguimiento' },
    { icon: MessageSquare, label: 'Mensajeria', desc: 'Email y WhatsApp' },
]

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 100)
        return () => clearTimeout(t)
    }, [])

    return (
        <section className="relative min-h-screen hero-dark overflow-hidden flex flex-col items-center justify-center px-[5%]">
            {/* Grid pattern */}
            <div className="absolute inset-0 energy-grid opacity-[0.03]" />

            {/* Horizontal glow line */}
            <div className="absolute top-[45%] left-0 w-full h-px">
                <div className="h-px w-1/3 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-glow-line" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-4xl mx-auto pt-24 pb-16">
                {/* Eyebrow */}
                <div
                    className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-12 border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-1000 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[13px] font-medium text-slate-400 tracking-wide">
                        CRM para asesores energeticos
                    </span>
                </div>

                {/* Headline */}
                <h1
                    className={`text-[clamp(2.2rem,6vw,5rem)] font-extrabold leading-[1.05] tracking-[-0.04em] mb-8 transition-all duration-1000 delay-150 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
                    style={{ textWrap: 'balance' } as React.CSSProperties}
                >
                    <span className="text-white">Compara. Contrata. Cobra.</span>
                    <br />
                    <span className="landing-gradient-text">Todo desde un solo lugar.</span>
                </h1>

                {/* Subheadline */}
                <p
                    className={`text-lg sm:text-xl text-slate-400 max-w-[600px] mx-auto mb-12 leading-relaxed transition-all duration-1000 delay-300 ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
                    style={{ textWrap: 'pretty' } as React.CSSProperties}
                >
                    La plataforma que unifica todas tus herramientas para que dediques el tiempo a vender, no a gestionar.
                </p>

                {/* CTAs */}
                <div
                    className={`flex flex-col sm:flex-row gap-4 justify-center mb-20 transition-all duration-1000 delay-[450ms] ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
                >
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="relative px-8 py-4 text-[15px] rounded-xl bg-[#2563eb] text-white border-none font-bold cursor-pointer landing-glow-blue transition-all duration-300 hover:bg-[#3b82f6]"
                    >
                        Empezar gratis
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="px-8 py-4 text-[15px] rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08] font-bold cursor-pointer backdrop-blur-sm hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all duration-300"
                    >
                        Ya tengo cuenta
                    </button>
                </div>

                {/* Capability pills */}
                <div
                    className={`grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-[800px] mx-auto transition-all duration-1000 delay-[600ms] ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    {capabilities.map((cap, i) => (
                        <div
                            key={i}
                            className="landing-card-premium rounded-xl p-4 flex flex-col items-center gap-2.5 cursor-default group"
                        >
                            <div className="w-9 h-9 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.12] flex items-center justify-center group-hover:bg-blue-500/[0.15] transition-colors duration-300">
                                <cap.icon className="w-[18px] h-[18px] text-blue-400" strokeWidth={1.8} />
                            </div>
                            <span className="text-white font-semibold text-sm">{cap.label}</span>
                            <span className="text-slate-500 text-xs text-center leading-snug">{cap.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-20" />
        </section>
    )
}
