import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Search, Users, FileText, MessageSquare, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useSpotlight(ref: React.RefObject<HTMLDivElement | null>) {
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--sx', `${e.clientX - rect.left}px`)
        el.style.setProperty('--sy', `${e.clientY - rect.top}px`)
    }
    return { onMouseMove: handleMouseMove }
}

function SpotlightCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null)
    const { onMouseMove } = useSpotlight(ref)
    return (
        <div ref={ref} className={`spotlight-card ${className ?? ''}`} style={style} onMouseMove={onMouseMove}>
            {children}
        </div>
    )
}

function ComparatorMockup() {
    return (
        <div className="mockup-container rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white">Resultados comparativa</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/15">12 tarifas analizadas</span>
            </div>
            <div className="space-y-2.5">
                {[
                    { name: 'Endesa Green', saving: '–24%', w: '84%', from: '#2563eb', to: '#10b981' },
                    { name: 'Holaluz', saving: '–15%', w: '62%', from: '#2563eb', to: '#60a5fa' },
                    { name: 'Naturgy Plus', saving: '–6%', w: '37%', from: '#d97706', to: '#f59e0b' },
                ].map((r, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">{r.name}</span>
                            <span className="text-[10px] font-bold text-emerald-400">{r.saving}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="h-full rounded-full" style={{ width: r.w, background: `linear-gradient(90deg, ${r.from}, ${r.to})` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 pt-2.5 flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-[9px] text-slate-600">Basado en consumo real del cliente</span>
                <span className="text-[9px] text-blue-400 font-semibold">Ver propuesta →</span>
            </div>
        </div>
    )
}

function CRMMockup() {
    return (
        <div className="mockup-container rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white">Cartera de clientes</span>
                <span className="text-[9px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/15">+ Nuevo cliente</span>
            </div>
            <div className="space-y-1.5">
                {[
                    { i: 'AB', n: 'Aceros Bilbao S.L.', s: 'Cliente', sc: 'text-emerald-400 bg-emerald-400/10' },
                    { i: 'DM', n: 'Distribuciones MG', s: 'Propuesta', sc: 'text-blue-400 bg-blue-400/10' },
                    { i: 'LS', n: 'Logística Sur', s: 'Contactado', sc: 'text-amber-400 bg-amber-400/10' },
                    { i: 'GF', n: 'Grupo Ferioli', s: 'Cliente', sc: 'text-emerald-400 bg-emerald-400/10' },
                ].map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1.5" style={{ borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div className="w-6 h-6 rounded-md text-[9px] font-bold text-blue-400 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.12)' }}>{c.i}</div>
                        <span className="text-[10px] text-slate-300 flex-1 truncate">{c.n}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${c.sc}`}>{c.s}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ContractsMockup() {
    return (
        <div className="mockup-container rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white">Contratos activos</span>
                <span className="text-[11px] font-extrabold text-white tracking-tight">7.240€<span className="text-[9px] text-slate-500 font-normal">/mes</span></span>
            </div>
            <div className="space-y-1.5">
                {[
                    { cups: 'ES003200E001...', Icon: CheckCircle2, col: 'text-emerald-400', amt: '240€' },
                    { cups: 'ES004800E002...', Icon: Clock, col: 'text-amber-400', amt: '180€' },
                    { cups: 'ES007100E003...', Icon: CheckCircle2, col: 'text-emerald-400', amt: '320€' },
                ].map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1.5" style={{ borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <c.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${c.col}`} strokeWidth={2} />
                        <span className="text-[10px] text-slate-400 flex-1 font-mono">{c.cups}</span>
                        <span className="text-[10px] font-bold text-white">{c.amt}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2.5 pt-2 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <TrendingUp className="w-3 h-3 text-emerald-400" strokeWidth={2.5} />
                <span className="text-[10px] text-emerald-400 font-semibold">Comisión estimada: 341€ este mes</span>
            </div>
        </div>
    )
}

function MessagingMockup() {
    return (
        <div className="mockup-container rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white">Conversaciones</span>
                <div className="flex gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(234,67,53,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Gmail</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(37,211,102,0.1)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)' }}>WhatsApp</span>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex">
                    <div className="max-w-[78%] px-3 py-1.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] text-slate-300">Buenos días, ¿tiene la comparativa?</p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <div className="max-w-[78%] px-3 py-1.5 rounded-2xl rounded-br-sm" style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.2)' }}>
                        <p className="text-[10px] text-blue-200">Hola Carlos, le envío la propuesta →</p>
                    </div>
                </div>
                <div className="flex">
                    <div className="max-w-[78%] px-3 py-1.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] text-slate-300">Perfecto, ¿cuándo podemos firmar?</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

const features = [
    { icon: Search, title: 'Comparador de Tarifas en Tiempo Real', desc: 'Sube la factura y obtén la mejor oferta en segundos. Compara más de 200 tarifas de luz y gas sin copiar datos a mano.', span: 'lg:col-span-7', accent: '#2563eb', Mockup: ComparatorMockup },
    { icon: Users, title: 'CRM para Gestión de Clientes y CUPS', desc: 'Toda tu cartera organizada. Busca por CIF, filtra por estado, accede al historial completo de cada suministro.', span: 'lg:col-span-5', accent: '#10b981', Mockup: CRMMockup },
    { icon: FileText, title: 'Gestión de Contratos Energéticos', desc: 'Contratos vinculados a comparativas con CUPS, tarifa y valor mensual. Controla el estado y tus comisiones.', span: 'lg:col-span-5', accent: '#f59e0b', Mockup: ContractsMockup },
    { icon: MessageSquare, title: 'Mensajería Integrada: Email y WhatsApp', desc: 'Comunícate con clientes por email y WhatsApp desde la misma plataforma, sin perder el contexto.', span: 'lg:col-span-7', accent: '#8b5cf6', Mockup: MessagingMockup },
]

export function FeaturesSection() {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        gsap.from('.features-header', {
            opacity: 0, y: 28, duration: 0.65, ease: 'power3.out',
            scrollTrigger: { trigger: '.features-header', start: 'top 85%', once: true },
        })

        ScrollTrigger.batch('.feature-card', {
            onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out' }),
            start: 'top 88%',
            once: true,
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} id="funcionalidades" className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />

            <div className="max-w-[1200px] mx-auto relative z-10">
                <div className="features-header text-center mb-16">
                    <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-5">
                        Funcionalidades del CRM Energético
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold tracking-[-0.03em] leading-tight text-white" style={{ textWrap: 'balance' } as React.CSSProperties}>
                        Herramientas diseñadas para{' '}
                        <span style={{ color: '#60a5fa' }}>cerrar operaciones</span>
                    </h2>
                    <p className="text-slate-500 text-base mt-4 max-w-[500px] mx-auto">Todo lo que un asesor energético necesita, sin complicaciones.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {features.map((feat, i) => {
                        const Icon = feat.icon
                        const Mockup = feat.Mockup
                        return (
                            <SpotlightCard
                                key={i}
                                className={`feature-card ${feat.span} rounded-2xl overflow-hidden`}
                                style={{ opacity: 0, transform: 'translateY(24px)' }}
                            >
                                <div className="p-6 lg:p-7">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: `${feat.accent}18`, border: `1px solid ${feat.accent}25` }}>
                                        <Icon className="w-[18px] h-[18px]" style={{ color: feat.accent }} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-[15px] font-bold text-white mb-2 tracking-[-0.01em]">{feat.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-[380px]">{feat.desc}</p>
                                </div>
                                <div className="px-5 pb-5">
                                    <Mockup />
                                </div>
                            </SpotlightCard>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
