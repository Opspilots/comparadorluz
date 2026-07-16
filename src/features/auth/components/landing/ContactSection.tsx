import { useRef, useState } from 'react'
import { Mail, Phone, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { supabase } from '@/shared/lib/supabase'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { GlassCard, LandingButton, SectionHeading } from './ui'

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
    const [submitError, setSubmitError] = useState<string | null>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) return
        gsap.from('.contact-left', {
            opacity: 0, x: -32, duration: 0.6, ease: 'power4.out',
            scrollTrigger: { trigger: '.contact-left', start: 'top 85%', once: true },
        })
        gsap.from('.contact-right', {
            opacity: 0, x: 32, duration: 0.6, delay: 0.08, ease: 'power4.out',
            scrollTrigger: { trigger: '.contact-right', start: 'top 85%', once: true },
        })
    }, { scope: sectionRef })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSending(true)
        setSubmitError(null)
        try {
            const { error } = await supabase.from('contact_requests').insert({
                nombre: form.nombre,
                email: form.email,
                empresa: form.empresa || null,
                mensaje: form.mensaje,
            })
            if (error) throw error
            setSent(true)
        } catch (err) {
            setSubmitError('No se pudo enviar el mensaje. Inténtalo de nuevo.')
        } finally {
            setSending(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    return (
        <section ref={sectionRef} id="contacto" className="relative py-28 lg:py-36 px-[5%]" style={{ background: 'var(--landing-bg)' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                {/* Left: info */}
                <div className="contact-left">
                    <SectionHeading
                        align="left"
                        className="mb-10"
                        kicker="Contacto"
                        title={<>¿Tienes preguntas?<br /><span className="gradient-text-bp">Hablemos</span></>}
                        subtitle="Nuestro equipo está disponible para resolver tus dudas, hacer una demo personalizada o ayudarte a dar tus primeros pasos con EnergyDeal."
                        subtitleMaxWidth="480px"
                    />

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
                                        <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.8} aria-hidden="true" />
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
                <GlassCard
                    as="div"
                    padding="lg"
                    className="contact-right rounded-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.022)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {sent ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                            <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-5" strokeWidth={1.5} aria-hidden="true" />
                            <h3 className="text-xl font-bold text-white mb-3">¡Mensaje enviado!</h3>
                            <p className="text-slate-500 text-sm">Nos ponemos en contacto contigo en menos de 24 horas.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            {submitError && (
                                <div
                                    id="submit-error-msg"
                                    role="alert"
                                    className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                                >
                                    {submitError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="contact-nombre" className="block text-[12px] font-semibold text-slate-400 mb-1.5">Nombre *</label>
                                    <input
                                        id="contact-nombre"
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tu nombre"
                                        className="contact-input"
                                        aria-invalid={submitError ? true : undefined}
                                        aria-describedby={submitError ? 'submit-error-msg' : undefined}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className="block text-[12px] font-semibold text-slate-400 mb-1.5">Email *</label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="tu@email.com"
                                        className="contact-input"
                                        aria-invalid={submitError ? true : undefined}
                                        aria-describedby={submitError ? 'submit-error-msg' : undefined}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-empresa" className="block text-[12px] font-semibold text-slate-400 mb-1.5">Empresa</label>
                                <input
                                    id="contact-empresa"
                                    name="empresa"
                                    value={form.empresa}
                                    onChange={handleChange}
                                    placeholder="Nombre de tu empresa o agencia"
                                    className="contact-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="contact-mensaje" className="block text-[12px] font-semibold text-slate-400 mb-1.5">Mensaje *</label>
                                <textarea
                                    id="contact-mensaje"
                                    name="mensaje"
                                    value={form.mensaje}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Cuéntanos en qué podemos ayudarte..."
                                    className="contact-input"
                                    style={{ minHeight: '110px' }}
                                    aria-invalid={submitError ? true : undefined}
                                    aria-describedby={submitError ? 'submit-error-msg' : undefined}
                                />
                            </div>
                            <LandingButton
                                type="submit"
                                fullWidth
                                loading={sending}
                                icon={<ArrowRight aria-hidden="true" />}
                            >
                                {sending ? 'Enviando...' : 'Enviar mensaje'}
                            </LandingButton>
                            <p className="text-[11px] text-slate-600 text-center">Respuesta garantizada en menos de 24h · Sin spam</p>
                        </form>
                    )}
                </GlassCard>
            </div>
        </section>
    )
}
