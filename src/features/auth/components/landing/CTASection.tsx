import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold: 0.3 }
        )
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    return (
        <section className="relative py-32 lg:py-40 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            {/* Glows */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 65%)', filter: 'blur(60px)' }}
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)', filter: 'blur(40px)' }}
            />

            <div
                ref={ref}
                className={`max-w-[640px] mx-auto relative z-10 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
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
                        className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#2563eb] text-white border-none rounded-xl font-bold text-[15px] cursor-pointer landing-glow-blue transition-all duration-300 hover:bg-[#3b82f6]"
                    >
                        Crear cuenta gratis
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.08] font-semibold text-[14px] cursor-pointer hover:bg-white/[0.07] hover:text-white transition-all duration-300"
                    >
                        Ya tengo cuenta
                    </button>
                </div>
            </div>
        </section>
    )
}
