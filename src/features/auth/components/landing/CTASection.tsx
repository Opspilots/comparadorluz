import { useRef } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { LandingButton, SectionHeading } from './ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) return
        // The final CTA gets the boldest entrance of the page — a touch of scale
        // on top of the usual fade/rise, reserved for this closing moment only.
        gsap.from('.cta-content', {
            opacity: 0, y: 32, scale: 0.96, duration: 0.7, ease: 'expo.out',
            scrollTrigger: { trigger: '.cta-content', start: 'top 80%', once: true },
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} className="relative py-32 lg:py-40 px-[5%] overflow-hidden" style={{ background: 'var(--landing-bg)' }}>
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
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} aria-hidden="true" />
                    <span className="text-[12px] font-medium text-slate-400">Empieza gratis hoy — sin tarjeta</span>
                </div>

                <SectionHeading
                    className="mb-10"
                    title={<><span className="text-white">Empieza a vender energía </span><span className="gradient-text-bp">de otra manera</span></>}
                    subtitle="Únete a las aseguradoras y corredurías que ya usan EnergyDeal para gestionar su cartera, comparar tarifas y cerrar más contratos."
                    subtitleMaxWidth="560px"
                />

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <LandingButton onClick={() => onOpenAuth('signup')} icon={<ArrowRight aria-hidden="true" />}>
                        Crear cuenta gratis
                    </LandingButton>
                    <LandingButton variant="secondary" onClick={() => onOpenAuth('login')}>
                        Ya tengo cuenta
                    </LandingButton>
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
