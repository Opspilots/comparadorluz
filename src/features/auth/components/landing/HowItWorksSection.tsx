import { useEffect, useRef, useState } from 'react'
import { Upload, BarChart2, BadgeCheck } from 'lucide-react'

function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold }
        )
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [threshold])
    return { ref, visible }
}

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
    const { ref, visible } = useInView(0.1)

    return (
        <section id="como-funciona" className="relative py-20 lg:py-28 px-[5%]" style={{ background: '#020209' }}>
            {/* Subtle top separator — no absolute, just border-top on the inner container */}
            <div className="max-w-[1100px] mx-auto">

                {/* Section label + heading */}
                <div
                    ref={ref}
                    className="text-center mb-16"
                    style={{
                        transition: 'opacity 0.7s ease, transform 0.7s ease',
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(24px)',
                    }}
                >
                    <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[11px] font-bold text-blue-400 tracking-[0.12em] uppercase">
                            Cómo funciona
                        </span>
                    </div>

                    <h2
                        className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold text-white tracking-[-0.03em] mb-4"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        De la factura al contrato{' '}
                        <span className="gradient-text-bp">en tres pasos</span>
                    </h2>
                    <p className="text-slate-400 text-base max-w-[420px] mx-auto leading-relaxed">
                        Sin curva de aprendizaje. Empieza a comparar tarifas el mismo día.
                    </p>
                </div>

                {/* Steps grid — no absolute connector, uses CSS border trick instead */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    {steps.map((s, i) => {
                        const Icon = s.icon
                        return (
                            <div
                                key={i}
                                className="relative group rounded-2xl p-7 cursor-default overflow-hidden"
                                style={{
                                    background: 'rgba(255,255,255,0.016)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateY(0)' : 'translateY(28px)',
                                }}
                            >
                                {/* Hover accent */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                    style={{ background: `radial-gradient(ellipse at 20% 20%, ${s.bg} 0%, transparent 65%)` }}
                                />

                                {/* Step number — large, decorative, top-right */}
                                <div
                                    className="absolute top-5 right-6 font-extrabold leading-none select-none"
                                    style={{
                                        fontSize: '4rem',
                                        color: s.color,
                                        opacity: 0.07,
                                        letterSpacing: '-0.05em',
                                    }}
                                >
                                    {s.num}
                                </div>

                                {/* Icon */}
                                <div
                                    className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                                    style={{ background: s.bg, border: `1px solid ${s.border}` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={2} />
                                </div>

                                {/* Step label */}
                                <div
                                    className="text-[10px] font-bold tracking-[0.12em] uppercase mb-3"
                                    style={{ color: s.color }}
                                >
                                    Paso {s.num}
                                </div>

                                <h3 className="text-[1rem] font-bold text-white mb-2.5 tracking-[-0.01em] leading-snug">{s.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>

                                {/* Bottom accent bar on hover */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                                />
                            </div>
                        )
                    })}
                </div>

                {/* Arrows between steps — desktop only, PART of layout flow (not absolute) */}
                <div className="hidden md:flex justify-center gap-4 mt-8">
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
