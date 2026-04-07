import { useEffect, useState } from 'react'
import { ArrowRight, Zap } from 'lucide-react'

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80)
        return () => clearTimeout(t)
    }, [])

    return (
        <section
            className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-[5%]"
            style={{ background: '#020209' }}
        >
            {/* Floating orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="orb-float-1 absolute top-[-15%] left-[5%] w-[700px] h-[700px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 65%)', filter: 'blur(40px)' }}
                />
                <div
                    className="orb-float-2 absolute top-[15%] right-[-8%] w-[550px] h-[550px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%)', filter: 'blur(40px)' }}
                />
                <div
                    className="orb-float-3 absolute bottom-[0%] left-[15%] w-[450px] h-[450px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)', filter: 'blur(50px)' }}
                />
            </div>

            {/* Dot grid */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.55) 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                    opacity: 0.025,
                }}
            />

            {/* Content */}
            <div className="relative z-10 text-center max-w-[940px] mx-auto pt-32 pb-20">
                {/* Eyebrow */}
                <div
                    className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10 border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-400 tracking-[0.08em] uppercase">
                        Software CRM para asesores energéticos
                    </span>
                </div>

                {/* H1 — SEO optimizado */}
                <h1
                    className={`text-[clamp(2.2rem,6vw,5.4rem)] font-extrabold leading-[1.04] tracking-[-0.04em] mb-6 transition-all duration-700 delay-[80ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ textWrap: 'balance' } as React.CSSProperties}
                >
                    <span className="text-white">El CRM para Asesores Energéticos</span>
                    <br />
                    <span className="gradient-text-bp">que Cierra más Contratos</span>
                </h1>

                {/* Subheadline — SEO keywords naturales */}
                <p
                    className={`text-base sm:text-[1.1rem] text-slate-400 max-w-[620px] mx-auto mb-10 leading-relaxed transition-all duration-700 delay-[160ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    style={{ textWrap: 'pretty' } as React.CSSProperties}
                >
                    Compara tarifas de luz y gas en tiempo real, gestiona tu cartera de clientes con CIF y CUPS, controla comisiones y comunícate por email y WhatsApp — todo en una plataforma diseñada para asesores y corredurías.
                </p>

                {/* CTAs */}
                <div
                    className={`flex flex-col sm:flex-row gap-3 justify-center mb-16 transition-all duration-700 delay-[240ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#2563eb] text-white font-bold text-[14px] cursor-pointer border-none transition-all duration-300 hover:bg-[#3b82f6] landing-glow-blue"
                    >
                        Empezar gratis — sin tarjeta
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                    </button>
                    <a
                        href="#como-funciona"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08] font-semibold text-[14px] cursor-pointer backdrop-blur-sm hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all duration-300"
                    >
                        <Zap className="w-4 h-4 text-blue-400" strokeWidth={2} />
                        Ver cómo funciona
                    </a>
                </div>

                {/* Trust indicators */}
                <div
                    className={`flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3 transition-all duration-700 delay-[320ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                    {[
                        { v: '200+', l: 'Tarifas en la base de datos' },
                        { v: '< 2 min', l: 'Por comparativa' },
                        { v: 'Gratis', l: 'Para empezar' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <span className="text-white font-bold text-base tracking-tight">{s.v}</span>
                            <span className="text-slate-600 text-sm">{s.l}</span>
                            {i < 2 && <div className="w-px h-3.5 bg-white/10 hidden sm:block" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#020209] to-transparent pointer-events-none z-20" />
        </section>
    )
}
