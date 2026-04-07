import { useEffect, useRef, useState } from 'react'
import { Upload, BarChart2, BadgeCheck } from 'lucide-react'

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

const steps = [
    {
        step: '01',
        icon: Upload,
        title: 'Conecta y carga datos',
        desc: 'Importa las facturas de tus clientes o introduce los datos manualmente. El sistema detecta automáticamente el CUPS y el consumo.',
        color: '#2563eb',
    },
    {
        step: '02',
        icon: BarChart2,
        title: 'Compara y genera propuesta',
        desc: 'En menos de 2 minutos obtienes una comparativa detallada con el ahorro potencial de cada tarifa del mercado libre.',
        color: '#7c3aed',
    },
    {
        step: '03',
        icon: BadgeCheck,
        title: 'Cierra y cobra tu comisión',
        desc: 'Gestiona el contrato, haz seguimiento del estado y controla tu comisión directamente desde la plataforma.',
        color: '#059669',
    },
]

export function HowItWorksSection() {
    const { ref, visible } = useInView(0.1)

    return (
        <section id="como-funciona" className="relative py-28 lg:py-36 px-[5%]" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto">
                {/* Header */}
                <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <span className="inline-block text-[11px] font-bold text-blue-400/80 tracking-[0.14em] uppercase mb-5">
                        Cómo funciona
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold text-white tracking-[-0.03em]"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        De la factura al contrato firmado
                        <br />
                        <span className="gradient-text-bp">en tres pasos</span>
                    </h2>
                </div>

                {/* Steps */}
                <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
                    {/* Connector line — desktop */}
                    <div
                        className="hidden md:block absolute top-[28px] h-px pointer-events-none"
                        style={{
                            left: 'calc(16.67% + 28px)',
                            right: 'calc(16.67% + 28px)',
                            background: 'linear-gradient(90deg, rgba(37,99,235,0.35), rgba(124,58,237,0.25), rgba(5,150,105,0.2))',
                        }}
                    />

                    {steps.map((s, i) => {
                        const Icon = s.icon
                        return (
                            <div
                                key={i}
                                className="relative"
                                style={{
                                    transition: `opacity 0.7s ease ${i * 150}ms, transform 0.7s ease ${i * 150}ms`,
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateY(0)' : 'translateY(32px)',
                                }}
                            >
                                {/* Icon + step number */}
                                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6" style={{ background: `${s.color}14`, border: `1px solid ${s.color}22` }}>
                                    <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.8} />
                                    <div
                                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                        style={{ background: '#020209', border: `1px solid ${s.color}35`, color: s.color }}
                                    >
                                        {s.step}
                                    </div>
                                </div>
                                <h3 className="text-[1.05rem] font-bold text-white mb-3 tracking-[-0.01em]">{s.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
