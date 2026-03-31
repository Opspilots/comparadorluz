import { useState } from 'react'
import { Check, Zap } from 'lucide-react'

interface PricingSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

const tiers = [
    {
        name: 'Gratis',
        monthly: 0,
        yearly: 0,
        features: ['Gestion Manual', 'Sin IA / OCR', '1 Usuario', 'Comparador Basico'],
        cta: 'Empezar gratis',
        highlight: false,
    },
    {
        name: 'Estandar',
        monthly: 19,
        yearly: 17,
        features: ['CRM Energetico', '100 usos IA/mes', '50 suministros', 'Soporte Email', 'Informes PDF'],
        cta: 'Elegir Estandar',
        highlight: false,
    },
    {
        name: 'Profesional',
        monthly: 49,
        yearly: 44,
        features: ['Todo ilimitado', 'IA y OCR sin limites', 'Soporte 24/7 VIP', 'Analitica Avanzada', 'Acceso API'],
        cta: 'Plan Profesional',
        highlight: true,
    },
]

export function PricingSection({ onOpenAuth }: PricingSectionProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    return (
        <section id="precios" className="py-24 lg:py-32 px-[5%] text-center bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-[-0.03em] text-[#0f172a]">
                    Elige tu plan
                </h2>
                <p className="text-lg text-[#64748b] mb-10">
                    Gestion eficiente para asesores de cualquier tamano.
                </p>

                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-5 mb-14">
                    <span className={`font-semibold transition-opacity ${billingCycle === 'monthly' ? 'opacity-100' : 'opacity-50'}`}>
                        Mensual
                    </span>
                    <button
                        type="button"
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative w-[56px] h-[30px] bg-[#2563eb] rounded-full p-1 cursor-pointer border-none"
                    >
                        <div
                            className="w-[22px] h-[22px] bg-white rounded-full transition-transform duration-300"
                            style={{
                                transform: billingCycle === 'yearly' ? 'translateX(26px)' : 'translateX(0)',
                                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                        />
                    </button>
                    <span className={`font-semibold transition-opacity ${billingCycle === 'yearly' ? 'opacity-100' : 'opacity-50'}`}>
                        Anual <span className="text-emerald-500 ml-1">(Ahorra 10%)</span>
                    </span>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-start">
                    {tiers.map((tier, i) => (
                        <div
                            key={i}
                            className={`rounded-[20px] text-left transition-all duration-300 ${
                                tier.highlight
                                    ? 'bg-[#0f172a] text-white shadow-[0_30px_60px_rgba(0,0,0,0.15)] md:-mt-4 md:mb-[-16px]'
                                    : 'bg-white border border-[#e2e8f0] shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
                            }`}
                        >
                            {/* Header */}
                            {tier.highlight && (
                                <div className="bg-[#2563eb] rounded-t-[20px] px-8 py-3 flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4 text-white" fill="white" />
                                    <span className="text-white text-sm font-bold tracking-wide uppercase">Mas popular</span>
                                </div>
                            )}

                            <div className="p-8 lg:p-10">
                                <h3 className={`text-xl font-extrabold mb-4 ${tier.highlight ? 'text-white' : 'text-[#0f172a]'}`}>
                                    {tier.name}
                                </h3>

                                <div className="mb-6">
                                    <span className={`text-5xl lg:text-[3.5rem] font-black tracking-[-0.02em] ${tier.highlight ? 'text-white' : 'text-[#0f172a]'}`}>
                                        {billingCycle === 'monthly' ? tier.monthly : tier.yearly}&euro;
                                    </span>
                                    <span className={`text-lg font-medium ml-1 ${tier.highlight ? 'text-white/60' : 'text-[#64748b]'}`}>/mes</span>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3">
                                            <Check className={`w-4 h-4 flex-shrink-0 ${tier.highlight ? 'text-emerald-400' : 'text-emerald-500'}`} strokeWidth={3} />
                                            <span className={tier.highlight ? 'text-white/80' : 'text-[#0f172a]/80'}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => onOpenAuth('signup')}
                                    className={`w-full py-3.5 rounded-xl font-extrabold text-base cursor-pointer transition-all duration-200 border-none ${
                                        tier.highlight
                                            ? 'bg-[#2563eb] text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-[#1d4ed8]'
                                            : 'bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]'
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
