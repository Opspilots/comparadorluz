import { useState, useRef } from 'react'
import { Plus, Minus } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { SectionHeading } from './ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const faqs = [
    {
        q: '¿Qué es EnergyDeal y para quién está pensado?',
        a: 'EnergyDeal es un CRM especializado en el sector energético, pensado para aseguradoras y corredurías de seguros que quieren vender energía a su cartera de clientes. Centraliza el comparador de tarifas, la gestión de clientes, contratos y mensajería en una sola plataforma.',
    },
    {
        q: '¿Puedo usar EnergyDeal si soy una aseguradora o correduría de seguros?',
        a: 'Sí, EnergyDeal está pensado precisamente para esto. Muchas corredurías y aseguradoras añaden la venta de energía como línea de ingresos adicional sobre la cartera de pólizas que ya gestionan. Gestionas clientes de seguros y suministros energéticos desde el mismo panel.',
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
        a: 'Sí, según el plan. El plan Profesional permite usuarios ilimitados, ideal para aseguradoras o corredurías con equipos comerciales. Cada usuario tiene su propio acceso y puedes controlar los permisos desde el panel de administración.',
    },
]

export function FAQSection() {
    const [open, setOpen] = useState<number | null>(0)
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) return
        gsap.from('.faq-header', {
            opacity: 0, y: 20, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: '.faq-header', start: 'top 85%', once: true },
        })
        gsap.from('.faq-container', {
            opacity: 0, y: 16, scale: 0.985, duration: 0.55, ease: 'power2.out',
            scrollTrigger: { trigger: '.faq-container', start: 'top 88%', once: true },
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} id="faq" className="relative py-28 lg:py-36 px-[5%]" style={{ background: 'var(--landing-bg)' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[800px] mx-auto">
                <SectionHeading
                    className="faq-header mb-14"
                    kicker="Preguntas Frecuentes sobre EnergyDeal CRM"
                    title={<>Todo lo que necesitas<br /><span className="gradient-text-bp">saber sobre EnergyDeal</span></>}
                />

                <div
                    className="faq-container"
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
                                aria-expanded={open === i}
                                aria-controls={`faq-answer-${i}`}
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
                                        ? <Minus className="w-3.5 h-3.5 text-blue-400" strokeWidth={2.5} aria-hidden="true" />
                                        : <Plus className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} aria-hidden="true" />
                                    }
                                </div>
                            </button>
                            <div id={`faq-answer-${i}`} className={`faq-answer ${open === i ? 'open' : ''}`}>
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
