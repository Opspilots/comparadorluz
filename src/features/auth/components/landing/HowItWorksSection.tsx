import { Fragment, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Upload, BarChart2, BadgeCheck, ArrowDown } from 'lucide-react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { GlassCard, SectionHeading } from './ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const steps = [
    {
        num: '01',
        icon: Upload,
        title: 'Conecta y carga datos',
        desc: 'Importa facturas o introduce datos manualmente. El sistema detecta automáticamente el CUPS y el consumo.',
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.08)',
        border: 'rgba(59,130,246,0.2)',
    },
    {
        num: '02',
        icon: BarChart2,
        title: 'Compara y genera propuesta',
        desc: 'En menos de 2 minutos obtienes una comparativa con el ahorro potencial de cada tarifa del mercado libre.',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.08)',
        border: 'rgba(139,92,246,0.2)',
    },
    {
        num: '03',
        icon: BadgeCheck,
        title: 'Cierra y cobra tu comisión',
        desc: 'Gestiona el contrato, haz seguimiento del estado y controla tu comisión directamente desde la plataforma.',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.2)',
    },
]

export function HowItWorksSection() {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) {
            gsap.set('.how-step-card, .how-connector', { opacity: 1, x: 0, y: 0, scale: 1 })
            return
        }
        gsap.from('.how-header', {
            opacity: 0, y: 24, duration: 0.5, ease: 'power3.out',
            scrollTrigger: { trigger: '.how-header', start: 'top 85%', once: true },
        })

        // Each step enters from a different direction for a distinct "sequence" feel
        // (left -> lift -> right), rather than reusing the generic batch-reveal used elsewhere.
        const directions = [
            { x: -32, y: 0, scale: 1 },
            { x: 0, y: 30, scale: 0.96 },
            { x: 32, y: 0, scale: 1 },
        ]
        gsap.utils.toArray<HTMLElement>('.how-step-card').forEach((card, i) => {
            gsap.from(card, {
                opacity: 0,
                x: directions[i]?.x ?? 0,
                y: directions[i]?.y ?? 0,
                scale: directions[i]?.scale ?? 1,
                duration: 0.55,
                delay: i * 0.12,
                ease: 'power3.out',
                scrollTrigger: { trigger: card, start: 'top 88%', once: true },
            })
        })

        gsap.from('.how-connector', {
            opacity: 0,
            duration: 0.4,
            stagger: 0.12,
            ease: 'power1.out',
            scrollTrigger: { trigger: '.how-steps-grid', start: 'top 80%', once: true },
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} id="como-funciona" className="relative py-20 lg:py-28 px-[5%]" style={{ background: 'var(--landing-bg)' }}>
            <div className="max-w-[1100px] mx-auto">
                <SectionHeading
                    className="how-header mb-16"
                    kicker="Cómo funciona"
                    title={<>De la factura al contrato{' '}<span className="gradient-text-bp">en tres pasos</span></>}
                    subtitle="Sin curva de aprendizaje. Empieza a comparar tarifas el mismo día."
                    subtitleMaxWidth="420px"
                />

                {/* Steps grid — sm:2 cols intermediate step before lg:3, plus a mobile-only
                    vertical connector so the sequence reads as a process when stacked. */}
                <div className="how-steps-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {steps.map((s, i) => {
                        const Icon = s.icon
                        return (
                            <Fragment key={i}>
                                <GlassCard
                                    as="article"
                                    hover="lift"
                                    padding="lg"
                                    className="how-step-card relative group overflow-hidden cursor-default rounded-2xl"
                                    style={{ border: `1px solid ${s.border}` }}
                                >
                                    {/* Hover accent */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                        style={{ background: `radial-gradient(ellipse at 20% 20%, ${s.bg} 0%, transparent 65%)` }}
                                    />

                                    {/* Step number — large, decorative, top-right */}
                                    <div
                                        className="absolute top-5 right-6 font-extrabold leading-none select-none"
                                        style={{ fontSize: '4rem', color: s.color, opacity: 0.07, letterSpacing: '-0.05em' }}
                                    >
                                        {s.num}
                                    </div>

                                    {/* Icon */}
                                    <div
                                        className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={2} aria-hidden="true" />
                                    </div>

                                    {/* Step label */}
                                    <div className="text-[10px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: s.color }}>
                                        Paso {s.num}
                                    </div>

                                    <h3 className="text-[1rem] font-bold text-white mb-2.5 tracking-[-0.01em] leading-snug">{s.title}</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>

                                    {/* Bottom accent bar on hover */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                                    />
                                </GlassCard>

                                {/* Mobile-only sequential connector between stacked cards */}
                                {i < steps.length - 1 && (
                                    <div className="how-connector flex sm:hidden items-center justify-center gap-1.5 -my-1" aria-hidden="true">
                                        <div className="w-px h-6" style={{ background: `linear-gradient(180deg, ${s.color}, ${steps[i + 1].color})` }} />
                                        <ArrowDown className="w-3.5 h-3.5" style={{ color: steps[i + 1].color }} strokeWidth={2.5} />
                                    </div>
                                )}
                            </Fragment>
                        )
                    })}
                </div>

                {/* Sequential indicator — desktop only, matches the 3-across single row layout */}
                <div className="hidden lg:flex justify-center gap-4 mt-8">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 text-slate-600"
                            style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                        >
                            <div className="w-2 h-2 rounded-full" style={{ background: steps[i].color, boxShadow: `0 0 6px ${steps[i].color}` }} />
                            <span style={{ color: steps[i].color }}>{steps[i].num}</span>
                            {i < 2 && (
                                <span className="text-slate-700 ml-2">→</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
