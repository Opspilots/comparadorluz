import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

interface PricingSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const tiers = [
    {
        name: 'Gratis',
        desc: 'Para empezar',
        monthly: 0,
        yearly: 0,
        features: ['Gestion manual', '1 usuario', 'Comparador basico', 'Soporte comunidad'],
        cta: 'Empezar gratis',
        highlight: false,
    },
    {
        name: 'Estandar',
        desc: 'Para crecer',
        monthly: 19,
        yearly: 17,
        features: ['CRM energetico', '100 usos IA/mes', '50 suministros', 'Soporte email', 'Informes PDF'],
        cta: 'Elegir Estandar',
        highlight: false,
    },
    {
        name: 'Profesional',
        desc: 'Sin limites',
        monthly: 49,
        yearly: 44,
        features: ['Todo ilimitado', 'IA y OCR sin limites', 'Soporte prioritario', 'Analitica avanzada', 'Acceso API'],
        cta: 'Elegir Profesional',
        highlight: true,
    },
]

export function PricingSection({ onOpenAuth }: PricingSectionProps) {
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold: 0.05 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section id="precios" className="py-24 lg:py-32 px-[5%] bg-white relative">
            <div
                ref={ref}
                className={`max-w-[1100px] mx-auto transition-all duration-700 ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="inline-block text-[13px] font-medium text-blue-500 tracking-widest uppercase mb-5">
                        Precios
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-[#0f172a] tracking-[-0.03em] mb-4"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        Simple y transparente
                    </h2>
                    <p className="text-[#64748b] text-base max-w-[400px] mx-auto">
                        Empieza gratis. Escala cuando lo necesites.
                    </p>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-center gap-4 mb-14">
                    <span className={`text-sm font-semibold transition-colors ${billing === 'monthly' ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
                        Mensual
                    </span>
                    <button
                        onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative w-[52px] h-[28px] bg-[#2563eb] rounded-full p-1 cursor-pointer border-none"
                    >
                        <div
                            className="w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300"
                            style={{
                                transform: billing === 'yearly' ? 'translateX(24px)' : 'translateX(0)',
                                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                        />
                    </button>
                    <span className={`text-sm font-semibold transition-colors ${billing === 'yearly' ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
                        Anual <span className="text-emerald-500 text-xs ml-1">-10%</span>
                    </span>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                    {tiers.map((tier, i) => (
                        <div
                            key={i}
                            className={`rounded-2xl text-left transition-all duration-500 ${
                                tier.highlight
                                    ? 'bg-[#0f172a] text-white shadow-[0_25px_80px_rgba(0,0,0,0.15)] md:-mt-4 md:mb-[-16px] ring-1 ring-blue-500/20'
                                    : 'bg-[#fafafa] border border-[#e5e7eb]'
                            }`}
                        >
                            {tier.highlight && (
                                <div className="bg-[#2563eb] rounded-t-2xl px-6 py-2.5 text-center">
                                    <span className="text-white text-xs font-bold tracking-widest uppercase">Mas popular</span>
                                </div>
                            )}

                            <div className="p-7 lg:p-8">
                                <h3 className={`text-lg font-bold mb-0.5 ${tier.highlight ? 'text-white' : 'text-[#0f172a]'}`}>
                                    {tier.name}
                                </h3>
                                <p className={`text-xs mb-6 ${tier.highlight ? 'text-slate-400' : 'text-[#94a3b8]'}`}>
                                    {tier.desc}
                                </p>

                                <div className="mb-7">
                                    <span className={`text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] ${tier.highlight ? 'text-white' : 'text-[#0f172a]'}`}>
                                        {billing === 'monthly' ? tier.monthly : tier.yearly}&euro;
                                    </span>
                                    <span className={`text-sm font-medium ml-1 ${tier.highlight ? 'text-slate-500' : 'text-[#94a3b8]'}`}>/mes</span>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center gap-2.5">
                                            <Check className={`w-3.5 h-3.5 flex-shrink-0 ${tier.highlight ? 'text-emerald-400' : 'text-emerald-500'}`} strokeWidth={3} />
                                            <span className={`text-sm ${tier.highlight ? 'text-slate-300' : 'text-[#64748b]'}`}>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => onOpenAuth('signup')}
                                    className={`w-full py-3 rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 border-none ${
                                        tier.highlight
                                            ? 'bg-[#2563eb] text-white hover:bg-[#3b82f6] landing-glow-blue'
                                            : 'bg-white text-[#0f172a] shadow-sm border border-[#e5e7eb] hover:shadow-md'
                                    }`}
                                >
                                    {tier.cta}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
