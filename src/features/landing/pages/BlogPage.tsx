import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react'

function EnergyPulseIcon() {
    return (
        <svg width="26" height="16" viewBox="0 0 30 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9 L7 9 L9.5 2 L12 16 L14.5 9 L17 9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 9 L29 9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
        </svg>
    )
}

const posts = [
    {
        slug: 'comparar-tarifas-energia-empresas',
        category: 'Guía',
        catColor: '#2563eb',
        title: 'Cómo comparar tarifas de energía para empresas en el mercado libre',
        excerpt: 'Aprende a analizar el consumo de tus clientes empresariales y encontrar la tarifa de electricidad y gas más competitiva del mercado libre en 2026. Todo el proceso paso a paso.',
        date: '2 Apr 2026',
        readTime: '8 min',
    },
    {
        slug: 'gestion-cartera-clientes-asesores',
        category: 'CRM',
        catColor: '#7c3aed',
        title: 'Gestión de cartera de clientes para asesores energéticos',
        excerpt: 'Cómo organizar tu cartera con CIF y CUPS, automatizar el seguimiento y aumentar tu tasa de conversión.',
        date: '28 Mar 2026',
        readTime: '6 min',
    },
    {
        slug: 'corredurias-seguros-energia',
        category: 'Negocio',
        catColor: '#059669',
        title: 'Por qué las corredurías de seguros están añadiendo energía a su oferta',
        excerpt: 'Las corredurías que venden tarifas energéticas están aumentando sus ingresos un 30% de media. Te explicamos cómo funciona el modelo.',
        date: '20 Mar 2026',
        readTime: '5 min',
    },
    {
        slug: 'cups-consumo-automatico-ia',
        category: 'Tecnología',
        catColor: '#d97706',
        title: 'OCR e IA para leer facturas de energía automáticamente',
        excerpt: 'Cómo la lectura automática de facturas con inteligencia artificial elimina el trabajo manual y reduce errores en la captura de CUPS y consumos.',
        date: '12 Mar 2026',
        readTime: '4 min',
    },
    {
        slug: 'comisiones-mercado-libre',
        category: 'Negocio',
        catColor: '#059669',
        title: 'Estructura de comisiones en el mercado libre energético',
        excerpt: 'Guía completa sobre cómo funcionan las comisiones de los agentes y corredurías en el mercado libre: modelos, plazos y mejores prácticas.',
        date: '5 Mar 2026',
        readTime: '7 min',
    },
    {
        slug: 'rgpd-asesores-energia',
        category: 'Legal',
        catColor: '#6366f1',
        title: 'RGPD para asesores energéticos: qué necesitas saber',
        excerpt: 'El RD 88/2026 endurece los requisitos de consentimiento para contacto comercial. Descubre qué debes implementar antes de que sea obligatorio.',
        date: '25 Feb 2026',
        readTime: '6 min',
    },
]

export function BlogPage() {
    return (
        <div className="min-h-screen" style={{ background: '#020209' }}>
            {/* Header */}
            <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,2,9,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="max-w-[1100px] mx-auto px-[5%] py-4 flex items-center justify-between">
                    <Link to="/login" style={{ textDecoration: 'none' }} className="flex items-center gap-2">
                        <EnergyPulseIcon />
                        <span className="text-[1rem] font-extrabold tracking-[-0.03em] text-white">
                            Energy<span style={{ color: '#60a5fa' }}>Deal</span>
                        </span>
                    </Link>
                    <Link to="/login" style={{ textDecoration: 'none' }} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                        Volver al inicio
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <div className="max-w-[1100px] mx-auto px-[5%] pt-16 pb-10">
                <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-4">Blog y Recursos</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.03em] mb-3">
                    Recursos para el <span style={{ color: '#60a5fa' }}>sector energético</span>
                </h1>
                <p className="text-slate-500 text-base max-w-[480px]">
                    Guías, estrategias y novedades para asesores energéticos y corredurías que quieren cerrar más contratos.
                </p>
            </div>

            {/* Posts grid */}
            <div className="max-w-[1100px] mx-auto px-[5%] pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {posts.map((post, i) => (
                        <Link
                            key={post.slug}
                            to={`/blog/${post.slug}`}
                            style={{ textDecoration: 'none' }}
                            className={`rounded-2xl overflow-hidden group cursor-pointer flex flex-col ${i === 0 ? 'lg:col-span-7' : i === 1 ? 'lg:col-span-5' : 'lg:col-span-4'}`}
                        >
                        <article
                            style={{
                                background: 'rgba(255,255,255,0.022)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                borderRadius: '1rem',
                                overflow: 'hidden',
                            }}
                        >
                            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${post.catColor}, ${post.catColor}50)` }} />
                            <div className={`flex flex-col flex-1 ${i === 0 ? 'p-8' : 'p-6'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span
                                        className="text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded"
                                        style={{ background: `${post.catColor}18`, color: post.catColor }}
                                    >
                                        {post.category}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-slate-600">
                                        <Clock className="w-3 h-3" />
                                        {post.readTime}
                                    </span>
                                </div>
                                <h2 className={`font-bold text-white mb-3 leading-snug tracking-[-0.01em] group-hover:text-blue-200 transition-colors flex-1 ${i === 0 ? 'text-[1.15rem]' : 'text-[0.9375rem]'}`}>
                                    {post.title}
                                </h2>
                                <p className={`text-slate-500 leading-relaxed mb-5 ${i === 0 ? 'text-[14px]' : 'text-[12px] line-clamp-2'}`}>
                                    {post.excerpt}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[11px] text-slate-600">{post.date}</span>
                                    <span className="inline-flex items-center gap-1.5 text-[12px] text-blue-400 font-semibold group-hover:text-blue-300 transition-colors">
                                        Leer artículo
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                                    </span>
                                </div>
                            </div>
                        </article>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
