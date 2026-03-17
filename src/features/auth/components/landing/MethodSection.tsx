const steps = [
    {
        step: '01',
        title: 'Carga Inteligente',
        desc: 'Nuestra IA lee cualquier factura en segundos, sin errores manuales.',
    },
    {
        step: '02',
        title: 'Analisis Profundo',
        desc: 'Comparamos contra +200 comercializadoras en tiempo real.',
    },
    {
        step: '03',
        title: 'Optimizacion',
        desc: 'Generamos la propuesta mas economica para tu cliente.',
    },
    {
        step: '04',
        title: 'Cierre Digital',
        desc: 'Firma y envio de contrato automatico desde el CRM.',
    },
]

export function MethodSection() {
    return (
        <section className="py-24 lg:py-32 px-[5%] bg-[#0f172a] relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -top-[10%] left-[10%] w-[300px] h-[300px] bg-emerald-500/[0.03] blur-[100px] rounded-full" />

            <div className="max-w-[1200px] mx-auto relative z-10">
                <h2 className="text-center text-3xl sm:text-4xl lg:text-[3.5rem] font-black mb-16 lg:mb-20 tracking-[-0.04em] text-gradient-fade leading-tight">
                    Nuestro Metodo de 4 pasos
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 stagger-children">
                    {steps.map((item, i) => (
                        <div
                            key={i}
                            className="text-left pl-6 border-l border-white/10 landing-hover-lift"
                        >
                            <div className="text-[4.5rem] font-black text-blue-500/10 font-mono leading-none -mb-2 select-none">
                                {item.step}
                            </div>
                            <h3 className="text-xl lg:text-2xl font-extrabold text-white mb-3 relative pt-2">
                                {item.title}
                            </h3>
                            <p className="text-slate-400 text-base lg:text-lg leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
