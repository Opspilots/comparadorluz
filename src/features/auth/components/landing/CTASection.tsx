import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section id="contacto" className="relative py-32 lg:py-40 px-[5%] overflow-hidden" style={{ background: '#050508' }}>
            {/* Centered glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[150px] pointer-events-none" />
            <div className="landing-divider absolute top-0 left-[10%] right-[10%]" />

            <div
                ref={ref}
                className={`max-w-[600px] mx-auto relative z-10 text-center transition-all duration-700 ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                <h2
                    className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-[-0.03em] leading-tight mb-6"
                    style={{ textWrap: 'balance' } as React.CSSProperties}
                >
                    <span className="text-white">Empieza a vender energia </span>
                    <span className="landing-gradient-text">de otra manera</span>
                </h2>
                <p className="text-base text-slate-400 mb-10 leading-relaxed">
                    Crea tu cuenta en 30 segundos. Sin tarjeta, sin compromiso.
                </p>

                <button
                    onClick={() => onOpenAuth('signup')}
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-[#2563eb] text-white border-none rounded-xl font-bold text-[15px] cursor-pointer landing-glow-blue transition-all duration-300 hover:bg-[#3b82f6]"
                >
                    Crear cuenta gratis
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                </button>
            </div>
        </section>
    )
}
