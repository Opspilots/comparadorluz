import { EnergyGrid } from './EnergyGrid'

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    return (
        <section className="relative min-h-screen bg-[#0f172a] overflow-hidden flex flex-col items-center justify-center px-[5%] pt-28 pb-20">
            <EnergyGrid />

            {/* Content */}
            <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in">
                {/* Badge */}
                <div className="inline-block px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold mb-8 border border-blue-500/20">
                    El CRM de energia numero #1 en Espana
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-light leading-[1.05] mb-6 tracking-[-0.04em] text-white">
                    Transforma tu asesoria{' '}
                    <br className="hidden sm:block" />
                    <span className="font-extrabold text-gradient-blue">
                        con Inteligencia Artificial
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-400 max-w-[750px] mx-auto mb-10 leading-relaxed">
                    Sube facturas, analiza tarifas y genera contratos en segundos.
                    La plataforma definitiva para el profesional energetico.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-8 py-4 text-lg rounded-2xl bg-[#2563eb] text-white border-none font-extrabold cursor-pointer shadow-[0_20px_40px_rgba(59,130,246,0.3)] hover:bg-[#1d4ed8] hover:shadow-[0_24px_48px_rgba(59,130,246,0.4)] transition-all duration-200"
                    >
                        Pruebalo ahora
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="px-8 py-4 text-lg rounded-2xl bg-transparent text-white border border-white/20 font-extrabold cursor-pointer flex items-center justify-center gap-2.5 hover:bg-white/5 hover:border-white/30 transition-all duration-200"
                    >
                        Ya tengo cuenta
                    </button>
                </div>
            </div>

            {/* App Mockup */}
            <div className="relative z-10 mt-16 w-full max-w-[1000px] mx-auto animate-fade-in hidden sm:block" style={{ animationDelay: '0.3s' }}>
                <div className="bg-white/[0.03] p-3 rounded-[32px] border border-white/[0.06] shadow-[0_40px_100px_rgba(0,0,0,0.3)] backdrop-blur-sm">
                    <div className="bg-[#0f172a] rounded-3xl h-[400px] lg:h-[500px] overflow-hidden flex relative border border-white/[0.04]">
                        <div className="w-full h-full p-6 lg:p-8 flex gap-6">
                            {/* Sidebar Mockup */}
                            <div className="w-[180px] hidden lg:flex flex-col gap-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div
                                        key={i}
                                        className={`h-8 rounded-md ${i === 1 ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/[0.03]'}`}
                                    />
                                ))}
                            </div>
                            {/* Main Content Mockup */}
                            <div className="flex-1 flex flex-col gap-5">
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { color: 'blue', value: '2,847' },
                                        { color: 'emerald', value: '1,204' },
                                        { color: 'amber', value: '89.3%' },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className={`h-20 lg:h-24 rounded-2xl border flex flex-col justify-center px-4 ${
                                                item.color === 'blue'
                                                    ? 'bg-blue-500/[0.06] border-blue-500/20'
                                                    : item.color === 'emerald'
                                                    ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                                                    : 'bg-amber-500/[0.06] border-amber-500/20'
                                            }`}
                                        >
                                            <div className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mb-1">
                                                {i === 0 ? 'Clientes' : i === 1 ? 'Contratos' : 'Conversion'}
                                            </div>
                                            <div className="text-white/80 text-lg lg:text-xl font-bold tracking-tight">{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 bg-white/[0.02] rounded-2xl border border-white/[0.04] p-5">
                                    {/* Chart bars mockup */}
                                    <div className="flex items-end gap-2 h-full">
                                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                                <div
                                                    className="rounded-t-sm bg-gradient-to-t from-blue-500/40 to-emerald-500/20 transition-all duration-500"
                                                    style={{ height: `${h}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating badge */}
                        <div className="absolute top-5 right-5 glass-card rounded-2xl px-4 py-3 animate-float-card">
                            <div className="text-white/60 text-xs font-bold uppercase tracking-wider">Ahorro detectado</div>
                            <div className="text-emerald-400 text-2xl font-black tracking-tight">+12.4%</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
