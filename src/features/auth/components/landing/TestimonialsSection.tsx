import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Star } from 'lucide-react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const testimonials = [
    {
        name: 'Carlos Mendoza',
        role: 'Asesor energético independiente',
        location: 'Madrid',
        initials: 'CM',
        color: '#2563eb',
        quote: 'Antes tardaba 30 minutos en preparar una comparativa. Con EnergyDeal lo hago en menos de 2 y el cliente ve el ahorro al instante. He cerrado un 40% más de contratos este trimestre.',
        stars: 5,
        featured: true,
        metric: '+40%',
        metricLabel: 'más contratos',
    },
    {
        name: 'Laura García',
        role: 'Directora Comercial',
        location: 'Correduría Seguros Plus, Barcelona',
        initials: 'LG',
        color: '#7c3aed',
        quote: 'Tener el CRM, el comparador y la mensajería en un solo sitio cambió por completo nuestra productividad. Nuestro equipo es tres veces más eficiente.',
        stars: 5,
        featured: false,
    },
    {
        name: 'Javier Ruiz',
        role: 'CEO · EnergíaPymes.es',
        location: 'Sevilla',
        initials: 'JR',
        color: '#059669',
        quote: 'Gestionamos más de 400 clientes con EnergyDeal. El módulo de comisiones nos ahorra horas de cálculos manuales cada mes.',
        stars: 5,
        featured: false,
    },
]

export function TestimonialsSection() {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        gsap.from('.testimonials-header', {
            opacity: 0, y: 24, duration: 0.65, ease: 'power3.out',
            scrollTrigger: { trigger: '.testimonials-header', start: 'top 85%', once: true },
        })
        ScrollTrigger.batch('.testimonial-card', {
            onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out' }),
            start: 'top 88%',
            once: true,
        })
    }, { scope: sectionRef })

    const featured = testimonials[0]
    const rest = testimonials.slice(1)

    return (
        <section ref={sectionRef} className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.04) 0%, transparent 70%)' }}
            />

            <div className="max-w-[1100px] mx-auto relative z-10">
                <div className="testimonials-header text-center mb-14">
                    <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-5">
                        Testimonios
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-white tracking-[-0.03em]"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        Lo que dicen los asesores
                        <br />
                        <span className="gradient-text-bp">que ya usan EnergyDeal</span>
                    </h2>
                </div>

                {/* Asymmetric layout: 1 featured + 2 stacked */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Featured testimonial */}
                    <div
                        className="testimonial-card lg:col-span-7 rounded-2xl p-8 lg:p-10 flex flex-col justify-between"
                        style={{
                            opacity: 0,
                            transform: 'translateY(24px)',
                            background: 'rgba(255,255,255,0.022)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <div>
                            {/* Stars */}
                            <div className="flex gap-1 mb-6">
                                {Array.from({ length: featured.stars }).map((_, si) => (
                                    <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <p className="text-[1.05rem] text-slate-300 leading-relaxed mb-8 font-medium">
                                "{featured.quote}"
                            </p>
                        </div>

                        <div className="flex items-end justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3.5">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
                                    style={{ background: `${featured.color}20`, border: `1px solid ${featured.color}30` }}
                                >
                                    {featured.initials}
                                </div>
                                <div>
                                    <div className="text-[14px] font-semibold text-white">{featured.name}</div>
                                    <div className="text-[12px] text-slate-500">{featured.role} · {featured.location}</div>
                                </div>
                            </div>
                            {featured.metric && (
                                <div
                                    className="text-right flex-shrink-0 px-4 py-2 rounded-xl"
                                    style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
                                >
                                    <div className="text-[2rem] font-extrabold text-emerald-400 leading-none tracking-tight">{featured.metric}</div>
                                    <div className="text-[11px] text-emerald-600 mt-0.5">{featured.metricLabel}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Two smaller testimonials */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {rest.map((t, i) => (
                            <div
                                key={i}
                                className="testimonial-card flex-1 rounded-2xl p-7 flex flex-col justify-between"
                                style={{
                                    opacity: 0,
                                    transform: 'translateY(24px)',
                                    background: 'rgba(255,255,255,0.018)',
                                    border: '1px solid rgba(255,255,255,0.065)',
                                }}
                            >
                                <div className="flex gap-0.5 mb-4">
                                    {Array.from({ length: t.stars }).map((_, si) => (
                                        <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                                        style={{ background: `${t.color}20`, border: `1px solid ${t.color}30` }}
                                    >
                                        {t.initials}
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-white">{t.name}</div>
                                        <div className="text-[11px] text-slate-600">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
