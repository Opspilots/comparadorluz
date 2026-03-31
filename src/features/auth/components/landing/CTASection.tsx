import { useState } from 'react'
import { Send } from 'lucide-react'

interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    const [leadEmail, setLeadEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleLeadSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (leadEmail.trim()) {
            setSubmitted(true)
            // UI-only: no backend logic
        }
    }

    return (
        <section id="contacto" className="py-24 lg:py-28 px-[5%] text-center bg-gradient-to-br from-[#2563eb] to-[#10b981] relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
            }} />

            <div className="max-w-[800px] mx-auto relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-white mb-5 tracking-[-0.02em]">
                    &iquest;Listo para el siguiente nivel?
                </h2>
                <p className="text-lg lg:text-xl text-white/90 mb-10">
                    Asesores energéticos de toda España ya confían en EnergyDeal.
                </p>

                {/* Lead capture form */}
                {!submitted ? (
                    <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
                        <input
                            type="email"
                            value={leadEmail}
                            onChange={(e) => setLeadEmail(e.target.value)}
                            placeholder="Tu email profesional"
                            required
                            className="flex-1 px-5 py-3.5 rounded-xl bg-white/15 text-white placeholder:text-white/60 border border-white/20 font-medium focus:outline-none focus:border-white/50 focus:bg-white/20 transition-all duration-200"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3.5 bg-white text-[#2563eb] border-none rounded-xl font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Solicitar acceso
                        </button>
                    </form>
                ) : (
                    <div className="bg-white/15 border border-white/20 rounded-xl px-6 py-4 max-w-md mx-auto mb-6">
                        <p className="text-white font-bold">Recibido. Te contactaremos pronto.</p>
                    </div>
                )}

                <button
                    onClick={() => onOpenAuth('signup')}
                    className="px-10 py-4 bg-white text-[#2563eb] border-none rounded-2xl font-black text-lg cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200"
                >
                    Empezar gratis ahora
                </button>
            </div>
        </section>
    )
}
