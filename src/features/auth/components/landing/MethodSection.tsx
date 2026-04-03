import { useEffect, useRef, useState } from 'react'

const features = [
    {
        title: 'Comparador de tarifas',
        desc: 'Sube la factura y obtiene la mejor oferta del mercado en segundos. Sin copiar datos a mano.',
        image: '/screenshots/comparator.png',
        alt: 'Comparador de tarifas energeticas de EnergyDeal',
        glowColor: 'rgba(59,130,246,0.08)',
        span: 'lg:col-span-7',
    },
    {
        title: 'CRM de clientes',
        desc: 'Toda tu cartera organizada. Busca por CIF, filtra por estado, accede al historial completo.',
        image: '/screenshots/crm.png',
        alt: 'CRM de gestion de clientes energeticos',
        glowColor: 'rgba(16,185,129,0.08)',
        span: 'lg:col-span-5',
    },
    {
        title: 'Gestion de contratos',
        desc: 'Contratos vinculados a comparativas con CUPS, tarifa y valor mensual. De pendiente a firmado.',
        image: '/screenshots/contracts.png',
        alt: 'Gestion de contratos energeticos',
        glowColor: 'rgba(245,158,11,0.08)',
        span: 'lg:col-span-5',
    },
    {
        title: 'Mensajeria integrada',
        desc: 'Email y WhatsApp desde la misma plataforma. Sin cambiar de herramienta, sin perder contexto.',
        image: '/screenshots/messaging.png',
        alt: 'Mensajeria integrada con email y WhatsApp',
        glowColor: 'rgba(168,85,247,0.08)',
        span: 'lg:col-span-7',
    },
]

function useInView(threshold = 0.1) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [threshold])
    return { ref, visible }
}

export function MethodSection() {
    const header = useInView(0.2)

    return (
        <section id="funcionalidades" className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#050508' }}>
            {/* Top divider */}
            <div className="landing-divider absolute top-0 left-[10%] right-[10%]" />

            {/* Ambient glow */}
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-[1200px] mx-auto relative z-10">
                {/* Header */}
                <div
                    ref={header.ref}
                    className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${
                        header.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    <span className="inline-block text-[13px] font-medium text-blue-400/80 tracking-widest uppercase mb-5">
                        Funcionalidades
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold tracking-[-0.03em] leading-tight"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        <span className="text-white">Herramientas disenadas para </span>
                        <span className="landing-gradient-text">cerrar operaciones</span>
                    </h2>
                </div>

                {/* Bento grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {features.map((feat, i) => {
                        const card = useInView(0.08)
                        return (
                            <div
                                key={i}
                                ref={card.ref}
                                className={`${feat.span} landing-card-premium rounded-2xl overflow-hidden group transition-all duration-700 ${
                                    card.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                                }`}
                                style={{ transitionDelay: `${i * 120}ms` }}
                            >
                                {/* Text content */}
                                <div className="p-6 lg:p-7">
                                    <h3 className="text-lg font-bold text-white mb-1.5 tracking-[-0.01em]">
                                        {feat.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed max-w-[380px]">
                                        {feat.desc}
                                    </p>
                                </div>

                                {/* Screenshot */}
                                <div className="relative px-4 pb-0">
                                    {/* Glow behind */}
                                    <div
                                        className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-[120px] rounded-full blur-[60px] pointer-events-none"
                                        style={{ background: feat.glowColor }}
                                    />
                                    <div className="relative rounded-t-lg overflow-hidden border border-white/[0.06] border-b-0">
                                        <img
                                            src={feat.image}
                                            alt={feat.alt}
                                            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.015]"
                                            loading="lazy"
                                        />
                                        {/* Top shine */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
