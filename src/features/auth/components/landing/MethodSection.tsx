const features = [
    {
        title: 'Comparador inteligente',
        description:
            'Sube una factura y compara automaticamente contra todas las tarifas del mercado. Encuentra el mejor precio para tus clientes en segundos.',
        image: '/screenshots/comparator.png',
        alt: 'Comparador de tarifas energeticas con formulario de carga de factura, CUPS y periodos',
        imagePosition: 'right' as const,
    },
    {
        title: 'CRM y contratos integrados',
        description:
            'Gestiona clientes, genera contratos y haz seguimiento de cada operacion desde una unica plataforma.',
        image: '/screenshots/crm.png',
        alt: 'Lista de clientes del CRM con CIF, estado y acciones disponibles',
        imagePosition: 'left' as const,
    },
    {
        title: 'Comunicacion centralizada',
        description:
            'Contacta a tus clientes por email o WhatsApp sin salir del CRM. Historial completo de cada conversacion.',
        image: '/screenshots/messaging.png',
        alt: 'Interfaz de mensajeria con email y WhatsApp integrados',
        imagePosition: 'right' as const,
    },
]

export function MethodSection() {
    return (
        <section id="funcionalidades" className="py-24 lg:py-32 px-[5%] bg-[#0f172a] relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -top-[10%] left-[10%] w-[300px] h-[300px] bg-emerald-500/[0.03] blur-[100px] rounded-full" />

            <div className="max-w-[1200px] mx-auto relative z-10">
                <h2 className="text-center text-3xl sm:text-4xl lg:text-[3.5rem] font-black mb-6 tracking-[-0.04em] text-gradient-fade leading-tight">
                    Todo lo que necesitas para cerrar mas operaciones
                </h2>
                <p className="text-center text-lg text-slate-400 max-w-[600px] mx-auto mb-16 lg:mb-20">
                    Herramientas disenadas para que los asesores energeticos trabajen mas rapido y con menos esfuerzo.
                </p>

                <div className="flex flex-col gap-20 lg:gap-28">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                                feature.imagePosition === 'left' ? 'lg:[direction:rtl]' : ''
                            }`}
                        >
                            {/* Text */}
                            <div className={feature.imagePosition === 'left' ? 'lg:[direction:ltr]' : ''}>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-white mb-4 tracking-[-0.02em]">
                                    {feature.title}
                                </h3>
                                <p className="text-lg text-slate-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            {/* Screenshot */}
                            <div className={feature.imagePosition === 'left' ? 'lg:[direction:ltr]' : ''}>
                                <div className="rounded-xl border border-white/10 shadow-2xl overflow-hidden">
                                    <img
                                        src={feature.image}
                                        alt={feature.alt}
                                        className="w-full h-auto block"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
