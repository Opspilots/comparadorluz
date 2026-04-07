import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'

function useInView(threshold = 0.1) {
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

const testimonials = [
    {
        name: 'Carlos Mendoza',
        role: 'Asesor energético independiente',
        location: 'Madrid',
        initials: 'CM',
        color: '#2563eb',
        quote: 'Antes tardaba 30 minutos en preparar una comparativa. Con EnergyDeal lo hago en menos de 2 y el cliente ve el ahorro al instante. He cerrado un 40% más de contratos este trimestre.',
        stars: 5,
    },
    {
        name: 'Laura García',
        role: 'Directora Comercial',
        location: 'Correduría Seguros Plus, Barcelona',
        initials: 'LG',
        color: '#7c3aed',
        quote: 'Lo que más me convence es tener el CRM, el comparador y la mensajería en un solo sitio. Ya no perdemos leads por cambiar de herramienta. Nuestro equipo es tres veces más eficiente.',
        stars: 5,
    },
    {
        name: 'Javier Ruiz',
        role: 'CEO',
        location: 'EnergíaPymes.es, Sevilla',
        initials: 'JR',
        color: '#059669',
        quote: 'Gestionamos más de 400 clientes con EnergyDeal. El módulo de comisiones nos ahorra horas de cálculos manuales cada mes. El soporte es excelente y las actualizaciones son constantes.',
        stars: 5,
    },
]

export function TestimonialsSection() {
    const { ref, visible } = useInView(0.05)

    return (
        <section className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.03) 0%, transparent 70%)' }}
            />

            <div className="max-w-[1100px] mx-auto relative z-10">
                <div className="text-center mb-16">
                    <span className="inline-block text-[11px] font-bold text-blue-400/80 tracking-[0.14em] uppercase mb-5">
                        Testimonios
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold text-white tracking-[-0.03em]"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        Lo que dicen
                        <span className="gradient-text-bp"> nuestros asesores</span>
                    </h2>
                </div>

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="glass-card-v2 rounded-2xl p-7 flex flex-col"
                            style={{
                                transition: `opacity 0.7s ease ${i * 120}ms, transform 0.7s ease ${i * 120}ms`,
                                opacity: visible ? 1 : 0,
                                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                            }}
                        >
                            {/* Stars */}
                            <div className="flex gap-0.5 mb-5">
                                {Array.from({ length: t.stars }).map((_, si) => (
                                    <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-sm text-slate-400 leading-relaxed flex-1 mb-6">"{t.quote}"</p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                    style={{ background: `${t.color}22`, border: `1px solid ${t.color}30` }}
                                >
                                    {t.initials}
                                </div>
                                <div>
                                    <div className="text-[13px] font-semibold text-white">{t.name}</div>
                                    <div className="text-[11px] text-slate-500">{t.role}</div>
                                    <div className="text-[11px] text-slate-600">{t.location}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
