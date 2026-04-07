import { useRef, useState } from 'react'
import { Mail, Phone, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface FormState {
    nombre: string
    email: string
    empresa: string
    mensaje: string
}

export function ContactSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const [form, setForm] = useState<FormState>({ nombre: '', email: '', empresa: '', mensaje: '' })
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    useGSAP(() => {
        gsap.from('.contact-left', {
            opacity: 0, x: -24, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: '.contact-left', start: 'top 85%', once: true },
        })
        gsap.from('.contact-right', {
            opacity: 0, x: 24, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: '.contact-right', start: 'top 85%', once: true },
        })
    }, { scope: sectionRef })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSending(true)
        await new Promise(r => setTimeout(r, 1200))
        setSending(false)
        setSent(true)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    return (
        <section ref={sectionRef} id="contacto" className="relative py-28 lg:py-36 px-[5%]" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                {/* Left: info */}
                <div className="contact-left">
                    <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-5">
                        Contacto
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.03em] mb-5"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        ¿Tienes preguntas?
                        <br />
                        <span className="gradient-text-bp">Hablemos</span>
                    </h2>
                    <p className="text-slate-500 text-base mb-10 leading-relaxed">
                        Nuestro equipo está disponible para resolver tus dudas, hacer una demo personalizada o ayudarte a dar tus primeros pasos con EnergyDeal.
                    </p>

                    <div className="space-y-5">
                        {[
                            { icon: Mail, label: 'Email', value: 'hola@energydeal.es' },
                            { icon: Phone, label: 'Teléfono', value: '+34 91 000 00 00' },
                            { icon: MapPin, label: 'Ubicación', value: 'Madrid, España' },
                        ].map((item, i) => {
                            const Icon = item.icon
                            return (
                                <div key={i} className="flex items-center gap-3.5">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}
                                    >
                                        <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-slate-600 font-medium">{item.label}</div>
                                        <div className="text-sm text-slate-300 font-semibold">{item.value}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right: form */}
                <div
                    className="contact-right rounded-2xl p-7 lg:p-8"
                    style={{
                        background: 'rgba(255,255,255,0.022)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {sent ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                            <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-5" strokeWidth={1.5} />
                            <h3 className="text-xl font-bold text-white mb-3">¡Mensaje enviado!</h3>
                            <p className="text-slate-500 text-sm">Nos ponemos en contacto contigo en menos de 24 horas.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Nombre *</label>
                                    <input
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tu nombre"
                                        className="contact-input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="tu@email.com"
                                        className="contact-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Empresa</label>
                                <input
                                    name="empresa"
                                    value={form.empresa}
                                    onChange={handleChange}
                                    placeholder="Nombre de tu empresa o agencia"
                                    className="contact-input"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Mensaje *</label>
                                <textarea
                                    name="mensaje"
                                    value={form.mensaje}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Cuéntanos en qué podemos ayudarte..."
                                    className="contact-input"
                                    style={{ minHeight: '110px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending}
                                className="group w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-[#2563eb] text-white font-bold text-[14px] cursor-pointer border-none transition-all duration-300 hover:bg-[#3b82f6] landing-glow-blue disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {sending ? 'Enviando...' : 'Enviar mensaje'}
                                {!sending && (
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                                )}
                            </button>
                            <p className="text-[11px] text-slate-600 text-center">Respuesta garantizada en menos de 24h · Sin spam</p>
                        </form>
                    )}
                </div>
            </div>
        </section>
    )
}
