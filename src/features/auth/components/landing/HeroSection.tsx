import { EnergyGrid } from './EnergyGrid'

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    return (
        <section id="hero" className="relative min-h-screen bg-[#0f172a] overflow-hidden flex flex-col items-center justify-center px-[5%] pt-28 pb-20">
            <EnergyGrid />

            {/* Content */}
            <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold mb-8 border border-blue-500/20">
                    CRM para asesores energeticos
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-extrabold leading-[1.05] mb-6 tracking-[-0.04em] text-white">
                    Gestiona toda tu cartera{' '}
                    <br className="hidden sm:block" />
                    energetica desde un solo lugar
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-400 max-w-[750px] mx-auto mb-10 leading-relaxed">
                    Clientes, comparativas, contratos y comisiones. Todo centralizado para que cierres mas operaciones en menos tiempo.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-8 py-4 text-lg rounded-2xl bg-[#2563eb] text-white border-none font-extrabold cursor-pointer shadow-[0_20px_40px_rgba(59,130,246,0.3)] hover:bg-[#1d4ed8] hover:shadow-[0_24px_48px_rgba(59,130,246,0.4)] transition-all duration-200"
                    >
                        Empezar gratis
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="px-8 py-4 text-lg rounded-2xl bg-transparent text-white border border-white/20 font-extrabold cursor-pointer flex items-center justify-center gap-2.5 hover:bg-white/5 hover:border-white/30 transition-all duration-200"
                    >
                        Ya tengo cuenta
                    </button>
                </div>
            </div>

            {/* Dashboard Screenshot */}
            <div className="relative z-10 mt-16 w-full max-w-[1000px] mx-auto animate-fade-in hidden sm:block" style={{ animationDelay: '0.3s' }}>
                <div
                    className="rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                    style={{
                        perspective: '1200px',
                    }}
                >
                    <img
                        src="/screenshots/dashboard.png"
                        alt="Panel de control de EnergyDeal CRM con metricas, grafico de actividad y resumen reciente"
                        className="w-full h-auto block"
                        style={{
                            transform: 'perspective(1200px) rotateX(2deg)',
                        }}
                    />
                </div>
            </div>
        </section>
    )
}
