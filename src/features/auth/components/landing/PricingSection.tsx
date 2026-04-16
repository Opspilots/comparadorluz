import { useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Check, Zap, ArrowRight } from 'lucide-react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface PricingSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const tiers = [
    {
        name: 'Gratis',
        desc: 'Para empezar sin riesgo',
        monthly: 0,
        yearly: 0,
        features: [
            'Gestión manual de clientes',
            '1 usuario incluido',
            'Comparador básico de tarifas',
            'Soporte vía comunidad',
        ],
        cta: 'Empezar gratis',
        highlight: false,
    },
    {
        name: 'Estándar',
        desc: 'Para asesores en activo',
        monthly: 19,
        yearly: 17,
        features: [
            'CRM energético completo',
            '100 comparativas IA/mes',
            'Hasta 50 suministros activos',
            'Soporte por email',
            'Informes PDF exportables',
        ],
        cta: 'Elegir Estándar',
        highlight: false,
    },
    {
        name: 'Profesional',
        desc: 'Para agencias y corredurías',
        monthly: 49,
        yearly: 44,
        features: [
            'Todo ilimitado sin límites',
            'IA y OCR de facturas sin límites',
            'Soporte prioritario 24h',
            'Analítica avanzada de cartera',
            'Acceso a API REST',
        ],
        cta: 'Elegir Profesional',
        highlight: true,
    },
]

export function PricingSection({ onOpenAuth }: PricingSectionProps) {
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        gsap.from('.pricing-header', {
            opacity: 0, y: 24, duration: 0.6, ease: 'power3.out',
            scrollTrigger: { trigger: '.pricing-header', start: 'top 85%', once: true },
        })
        ScrollTrigger.batch('.pricing-card', {
            onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }),
            start: 'top 88%',
            once: true,
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} id="precios" className="py-24 lg:py-32 px-[5%] relative" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            {/* Subtle background glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.04) 0%, transparent 65%)', filter: 'blur(60px)' }}
            />

            <div className="max-w-[1100px] mx-auto relative z-10">
                {/* Header */}
                <div className="pricing-header text-center mb-14">
                    <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-5">
                        Precios
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-white tracking-[-0.03em] mb-4" style={{ textWrap: 'balance' } as React.CSSProperties}>
                        Simple y transparente
                    </h2>
                    <p className="text-slate-500 text-base max-w-[380px] mx-auto">Empieza gratis. Escala cuando lo necesites, sin contratos.</p>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-4 mb-14">
                    <span className={`text-sm font-semibold transition-colors duration-200 ${billing === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Mensual</span>
                    <button
                        onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative w-[52px] h-[28px] rounded-full p-1 cursor-pointer border-none transition-colors duration-300"
                        style={{ background: billing === 'yearly' ? '#2563eb' : 'rgba(255,255,255,0.1)' }}
                        aria-label="Cambiar ciclo de facturación"
                    >
                        <div
                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                            style={{
                                transform: billing === 'yearly' ? 'translateX(24px)' : 'translateX(0)',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                        />
                    </button>
                    <span className={`text-sm font-semibold transition-colors duration-200 ${billing === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
                        Anual <span className="text-emerald-400 text-xs font-bold ml-1">–10%</span>
                    </span>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {tiers.map((tier, i) => (
                        <div
                            key={i}
                            className={`pricing-card rounded-2xl text-left overflow-hidden ${tier.highlight ? 'md:-mt-6 md:mb-[-24px]' : ''}`}
                            style={{
                                opacity: 0,
                                transform: 'translateY(24px)',
                                background: tier.highlight ? 'rgba(8,8,24,0.95)' : 'rgba(255,255,255,0.025)',
                                border: tier.highlight
                                    ? '1px solid rgba(37,99,235,0.3)'
                                    : '1px solid rgba(255,255,255,0.07)',
                                boxShadow: tier.highlight
                                    ? '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : 'none',
                            }}
                        >
                            {/* Popular badge */}
                            {tier.highlight && (
                                <div
                                    className="flex items-center justify-center gap-2 px-6 py-2.5"
                                    style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb, #3b82f6)' }}
                                >
                                    <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} fill="currentColor" />
                                    <span className="text-white text-[11px] font-bold tracking-[0.12em] uppercase">Más popular</span>
                                </div>
                            )}

                            <div className="p-7 lg:p-8">
                                {/* Plan name */}
                                <h3 className={`text-lg font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-white'}`}>{tier.name}</h3>
                                <p className={`text-xs mb-6 ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{tier.desc}</p>

                                {/* Price */}
                                <div className="mb-7 flex items-end gap-1.5">
                                    <span className={`text-5xl font-extrabold tracking-[-0.04em] tabular-nums ${tier.highlight ? 'text-white' : 'text-white'}`}>
                                        {billing === 'monthly' ? tier.monthly : tier.yearly}€
                                    </span>
                                    <span className={`text-sm font-medium pb-1.5 ${tier.highlight ? 'text-slate-500' : 'text-slate-600'}`}>/mes</span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${tier.highlight ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-white/[0.05] border border-white/[0.08]'}`}>
                                                <Check className={`w-2.5 h-2.5 ${tier.highlight ? 'text-emerald-400' : 'text-slate-400'}`} strokeWidth={3} />
                                            </div>
                                            <span className={`text-[13px] leading-snug ${tier.highlight ? 'text-slate-300' : 'text-slate-400'}`}>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    onClick={() => onOpenAuth('signup')}
                                    className={`w-full py-3 rounded-xl font-semibold text-[14px] cursor-pointer transition-all duration-250 border-none active:scale-[0.98] flex items-center justify-center gap-2 ${
                                        tier.highlight
                                            ? 'bg-[#2563eb] text-white hover:bg-[#3b82f6] landing-glow-blue'
                                            : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                                    style={!tier.highlight ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}
                                >
                                    {tier.cta}
                                    {tier.highlight && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom note */}
                <p className="text-center text-[12px] text-slate-600 mt-10">
                    Sin tarjeta de crédito · Cancela cuando quieras · Datos almacenados en Europa (RGPD)
                </p>
            </div>
        </section>
    )
}
