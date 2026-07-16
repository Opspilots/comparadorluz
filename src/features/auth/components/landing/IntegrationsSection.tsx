import { useRef, useState } from 'react'
import { Mail, MessageCircle, Globe, Shield, Zap, FileText, Link2, BookOpen } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { SectionHeading } from './ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const integrations = [
    { name: 'Gmail', icon: Mail, color: '#ea4335', desc: 'Sincroniza emails' },
    { name: 'WhatsApp', icon: MessageCircle, color: '#25d366', desc: 'Mensajería directa' },
    { name: 'CNMC', icon: Globe, color: '#2563eb', desc: 'Datos oficiales' },
    { name: 'Stripe', icon: Shield, color: '#635bff', desc: 'Pagos seguros' },
    { name: 'Zapier', icon: Zap, color: '#ff4f00', desc: 'Automatizaciones' },
    { name: 'PDF / OCR', icon: FileText, color: '#f59e0b', desc: 'Lectura facturas' },
    { name: 'API REST', icon: Link2, color: '#10b981', desc: 'Integra tu stack' },
    { name: 'Outlook', icon: BookOpen, color: '#0078d4', desc: 'Email corporativo' },
]

const tickerItems = [...integrations, ...integrations]

export function IntegrationsSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const [paused, setPaused] = useState(false)

    useGSAP(() => {
        if (prefersReducedMotion()) return
        gsap.from('.integrations-header', {
            opacity: 0, y: 24, scale: 0.97, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: '.integrations-header', start: 'top 85%', once: true },
        })
    }, { scope: sectionRef })

    // Pause the infinite ticker on hover (desktop) and on touch (mobile) so
    // users can actually read the badges instead of chasing a moving target.
    const pauseHandlers = {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onTouchStart: () => setPaused(true),
        onTouchEnd: () => setPaused(false),
        onTouchCancel: () => setPaused(false),
    }

    return (
        <section ref={sectionRef} id="integraciones" className="relative py-24 lg:py-32 overflow-hidden" style={{ background: 'var(--landing-bg)' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            {/* Header */}
            <div className="max-w-[1100px] mx-auto px-[5%] mb-14">
                <SectionHeading
                    className="integrations-header"
                    kicker="Integraciones"
                    title={<>Conectado con las herramientas<br /><span className="gradient-text-bp">que ya utilizas</span></>}
                    subtitle="EnergyDeal se integra con Gmail, WhatsApp Business, la CNMC y las APIs de las principales comercializadoras del mercado libre."
                    subtitleMaxWidth="500px"
                />
            </div>

            {/* Infinite ticker — pauses on hover (desktop) and touch (mobile) for readability */}
            <div className="relative overflow-hidden" {...pauseHandlers}>
                {/* Fade masks */}
                <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--landing-bg), transparent)' }} />
                <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(-90deg, var(--landing-bg), transparent)' }} />

                <div
                    className="ticker-track flex gap-4 px-4 w-max"
                    style={{ animationPlayState: paused ? 'paused' : 'running' }}
                >
                    {tickerItems.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <div key={i} className="integration-badge flex-shrink-0">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
                                    <Icon className="w-4 h-4" style={{ color: item.color }} strokeWidth={1.8} aria-hidden="true" />
                                </div>
                                <div>
                                    <div className="text-[12px] font-semibold text-white leading-none mb-0.5">{item.name}</div>
                                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
