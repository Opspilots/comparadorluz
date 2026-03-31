import { Upload, BarChart3, TrendingDown, FileSignature } from 'lucide-react'

const steps = [
    {
        step: '01',
        title: 'Carga Inteligente',
        desc: 'Nuestra IA lee cualquier factura en segundos, sin errores manuales.',
        icon: Upload,
    },
    {
        step: '02',
        title: 'Análisis Profundo',
        desc: 'Comparamos contra +200 comercializadoras en tiempo real.',
        icon: BarChart3,
    },
    {
        step: '03',
        title: 'Optimización',
        desc: 'Generamos la propuesta más económica para tu cliente.',
        icon: TrendingDown,
    },
    {
        step: '04',
        title: 'Cierre Digital',
        desc: 'Firma y envío de contrato automático desde el CRM.',
        icon: FileSignature,
    },
]

export function MethodSection() {
    return (
        <section id="metodo" className="py-24 lg:py-32 px-[5%] bg-[#0f172a] relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -top-[10%] left-[10%] w-[300px] h-[300px] bg-emerald-500/[0.03] blur-[100px] rounded-full" />

            <div className="max-w-[1200px] mx-auto relative z-10">
                <h2 className="text-center text-3xl sm:text-4xl lg:text-[3.5rem] font-black mb-16 lg:mb-20 tracking-[-0.04em] text-gradient-fade leading-tight">
                    Nuestro Método de 4 pasos
                </h2>

                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 stagger-children">
                    {/* Connecting dotted line (desktop only) */}
                    <div className="hidden lg:block absolute top-[3.5rem] left-[12%] right-[12%] border-t-2 border-dashed border-white/[0.08]" />

                    {steps.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <div
                                key={i}
                                className="relative text-left landing-hover-lift"
                            >
                                {/* Step number circle with gradient */}
                                <div className="relative z-10 w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(37,99,235,0.25)]">
                                    <span className="text-white text-xl font-black font-mono">{item.step}</span>
                                </div>

                                {/* Icon */}
                                <div className="mb-3">
                                    <Icon className="w-6 h-6 text-blue-400/70" strokeWidth={2} />
                                </div>

                                <h3 className="text-xl lg:text-2xl font-extrabold text-white mb-3">
                                    {item.title}
                                </h3>
                                <p className="text-slate-400 text-base lg:text-lg leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
