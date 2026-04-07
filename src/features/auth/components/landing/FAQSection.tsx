import { useState, useRef, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'

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

const faqs = [
    {
        q: '¿Qué es EnergyDeal y para quién está pensado?',
        a: 'EnergyDeal es un CRM especializado en el sector energético, diseñado para asesores energéticos independientes, corredurías de seguros que ofrecen energía y agencias comercializadoras. Centraliza el comparador de tarifas, la gestión de clientes, contratos y mensajería en una sola plataforma.',
    },
    {
        q: '¿Puedo usar EnergyDeal si tengo una correduría de seguros?',
        a: 'Sí, absolutamente. Muchas corredurías de seguros están incorporando la venta de energía como servicio adicional. EnergyDeal está adaptado para este perfil, permitiéndote gestionar tanto clientes de seguros como suministros energéticos desde el mismo panel.',
    },
    {
        q: '¿Cuántas tarifas puedo comparar con la plataforma?',
        a: 'EnergyDeal tiene acceso a más de 200 tarifas de electricidad y gas natural del mercado libre en España. Las tarifas se actualizan periódicamente para reflejar las ofertas actuales de las principales comercializadoras.',
    },
    {
        q: '¿Cómo funciona el comparador de tarifas energéticas?',
        a: 'Puedes subir la factura del cliente (EnergyDeal extrae los datos automáticamente por OCR) o introducirlos manualmente. El sistema calcula el ahorro potencial de cada tarifa basándose en el consumo real y genera una propuesta profesional para presentar al cliente.',
    },
    {
        q: '¿Puedo empezar gratis? ¿Hay periodo de prueba?',
        a: 'Sí. El plan Gratis no tiene límite de tiempo y te permite empezar con funciones básicas sin introducir tarjeta de crédito. Cuando necesites más capacidad o funciones avanzadas, puedes pasar a Estándar o Profesional en cualquier momento.',
    },
    {
        q: '¿EnergyDeal se integra con Gmail y WhatsApp?',
        a: 'Sí. EnergyDeal se integra con Gmail para sincronizar conversaciones y con WhatsApp Business para enviar y recibir mensajes directamente desde la plataforma. También disponible integración con Outlook y acceso a la API oficial de la CNMC.',
    },
    {
        q: '¿Cómo se garantiza la seguridad y privacidad de mis datos?',
        a: 'Todos los datos se almacenan en servidores europeos cumpliendo el RGPD. Cada empresa tiene su propio espacio completamente aislado con políticas de acceso por roles. La conexión es siempre por HTTPS y los datos sensibles están cifrados en reposo.',
    },
    {
        q: '¿Puedo gestionar varios comerciales o usuarios?',
        a: 'Sí, según el plan. El plan Profesional permite usuarios ilimitados, ideal para agencias o corredurías con equipos comerciales. Cada usuario tiene su propio acceso y puedes controlar los permisos desde el panel de administración.',
    },
]

export function FAQSection() {
    const [open, setOpen] = useState<number | null>(0)
    const { ref, visible } = useInView(0.05)

    return (
        <section id="faq" className="relative py-28 lg:py-36 px-[5%]" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[800px] mx-auto">
                <div className="text-center mb-14">
                    <span className="inline-block text-[11px] font-bold text-blue-400/80 tracking-[0.14em] uppercase mb-5">
                        Preguntas Frecuentes sobre EnergyDeal CRM
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold text-white tracking-[-0.03em]"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        Todo lo que necesitas
                        <br />
                        <span className="gradient-text-bp">saber sobre EnergyDeal</span>
                    </h2>
                </div>

                <div
                    ref={ref}
                    className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ border: '1px solid rgba(255,255,255,0.065)', borderRadius: '16px', overflow: 'hidden' }}
                >
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            style={{ borderBottom: i < faqs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                        >
                            <button
                                onClick={() => setOpen(open === i ? null : i)}
                                className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 transition-colors duration-200 hover:bg-white/[0.02] cursor-pointer"
                                style={{ background: 'none', border: 'none' }}
                            >
                                <span className="text-[14px] font-semibold text-white leading-snug">{faq.q}</span>
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                                    style={{
                                        background: open === i ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${open === i ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    }}
                                >
                                    {open === i
                                        ? <Minus className="w-3.5 h-3.5 text-blue-400" strokeWidth={2.5} />
                                        : <Plus className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                                    }
                                </div>
                            </button>
                            <div className={`faq-answer ${open === i ? 'open' : ''}`}>
                                <div>
                                    <div className="px-6 pb-5">
                                        <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
