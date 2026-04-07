import { useRef } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        gsap.from('.cta-content', {
            opacity: 0, y: 32, duration: 0.75, ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-content', start: 'top 80%', once: true },
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} className="relative py-32 lg:py-40 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            {/* Layered glows */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 65%)', filter: 'blur(60px)' }}
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)', filter: 'blur(40px)' }}
            />

            <div className="cta-content max-w-[640px] mx-auto relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/[0.06] bg-white/[0.02]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                    <span className="text-[12px] font-medium text-slate-400">Empieza gratis hoy — sin tarjeta</span>
                </div>

                <h2
                    className="text-3xl sm:text-4xl lg:text-[3.2rem] font-extrabold tracking-[-0.03em] leading-tight mb-6"
                    style={{ textWrap: 'balance' } as React.CSSProperties}
                >
                    <span className="text-white">Empieza a vender energía </span>
                    <span className="gradient-text-bp">de otra manera</span>
                </h2>
                <p className="text-base text-slate-500 mb-10 leading-relaxed">
                    Únete a los asesores energéticos y corredurías que ya usan EnergyDeal para gestionar clientes, comparar tarifas y cerrar más contratos.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#2563eb] text-white border-none rounded-xl font-bold text-[15px] cursor-pointer landing-glow-blue btn-directional transition-all duration-300 hover:bg-[#3b82f6] active:scale-[0.98]"
                    >
                        Crear cuenta gratis
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08] font-semibold text-[14px] cursor-pointer hover:bg-white/[0.07] hover:text-white transition-all duration-300 active:scale-[0.98]"
                    >
                        Ya tengo cuenta
                    </button>
                </div>

                {/* Social proof bottom */}
                <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
                    {[
                        { v: 'Sin tarjeta', l: 'de crédito' },
                        { v: 'RGPD', l: 'compliant' },
                        { v: 'Cancela', l: 'cuando quieras' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">{s.v}</span>
                            <span className="text-slate-600 text-sm">{s.l}</span>
                            {i < 2 && <div className="w-px h-3 bg-white/10" />}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
