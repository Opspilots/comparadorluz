import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, Clock } from 'lucide-react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const posts = [
    {
        category: 'Guía',
        catColor: '#2563eb',
        title: 'Cómo comparar tarifas de energía para empresas en el mercado libre',
        excerpt: 'Aprende a analizar el consumo de tus clientes empresariales y encontrar la tarifa de electricidad y gas más competitiva del mercado libre en 2026. Todo el proceso paso a paso.',
        date: '2 Apr 2026',
        readTime: '8 min',
        featured: true,
    },
    {
        category: 'CRM',
        catColor: '#7c3aed',
        title: 'Gestión de cartera de clientes para asesores energéticos',
        excerpt: 'Cómo organizar tu cartera con CIF y CUPS, automatizar el seguimiento y aumentar tu tasa de conversión.',
        date: '28 Mar 2026',
        readTime: '6 min',
        featured: false,
    },
    {
        category: 'Negocio',
        catColor: '#059669',
        title: 'Por qué las corredurías de seguros están añadiendo energía a su oferta',
        excerpt: 'Las corredurías que venden tarifas energéticas están aumentando sus ingresos un 30% de media.',
        date: '20 Mar 2026',
        readTime: '5 min',
        featured: false,
    },
]

export function BlogSection() {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        gsap.from('.blog-header', {
            opacity: 0, y: 24, duration: 0.65, ease: 'power3.out',
            scrollTrigger: { trigger: '.blog-header', start: 'top 85%', once: true },
        })
        ScrollTrigger.batch('.blog-card', {
            onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out' }),
            start: 'top 88%',
            once: true,
        })
    }, { scope: sectionRef })

    const featured = posts[0]
    const rest = posts.slice(1)

    return (
        <section ref={sectionRef} id="blog" className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto relative z-10">
                {/* Header row */}
                <div className="blog-header flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                    <div>
                        <span className="inline-block text-[11px] font-bold text-blue-400/70 tracking-[0.15em] uppercase mb-5">
                            Blog y Recursos
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold text-white tracking-[-0.03em]"
                            style={{ textWrap: 'balance' } as React.CSSProperties}
                        >
                            Recursos para el
                            <br />
                            <span className="gradient-text-bp">sector energético</span>
                        </h2>
                    </div>
                    <a
                        href="/blog"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                    >
                        Ver todos los artículos
                        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                    </a>
                </div>

                {/* Asymmetric grid: featured (lg:col-span-7) + 2 stacked (lg:col-span-5) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Featured post */}
                    <article
                        className="blog-card lg:col-span-7 rounded-2xl overflow-hidden group cursor-pointer flex flex-col"
                        style={{
                            opacity: 0,
                            transform: 'translateY(24px)',
                            background: 'rgba(255,255,255,0.022)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {/* Color bar */}
                        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${featured.catColor}, ${featured.catColor}60)` }} />

                        <div className="p-8 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-5">
                                <span
                                    className="blog-tag"
                                    style={{ background: `${featured.catColor}18`, color: featured.catColor }}
                                >
                                    {featured.category}
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                    <Clock className="w-3 h-3" />
                                    {featured.readTime} lectura
                                </span>
                            </div>

                            <h3 className="text-[1.2rem] font-bold text-white mb-4 leading-snug tracking-[-0.01em] group-hover:text-blue-200 transition-colors flex-1">
                                {featured.title}
                            </h3>

                            <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
                                {featured.excerpt}
                            </p>

                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-[12px] text-slate-600">{featured.date}</span>
                                <span className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 font-semibold group-hover:text-blue-300 transition-colors">
                                    Leer artículo
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                                </span>
                            </div>
                        </div>
                    </article>

                    {/* Two smaller posts */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {rest.map((post, i) => (
                            <article
                                key={i}
                                className="blog-card flex-1 rounded-2xl overflow-hidden group cursor-pointer"
                                style={{
                                    opacity: 0,
                                    transform: 'translateY(24px)',
                                    background: 'rgba(255,255,255,0.018)',
                                    border: '1px solid rgba(255,255,255,0.065)',
                                }}
                            >
                                <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${post.catColor}, transparent)` }} />
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span
                                            className="blog-tag"
                                            style={{ background: `${post.catColor}18`, color: post.catColor }}
                                        >
                                            {post.category}
                                        </span>
                                        <span className="text-[11px] text-slate-600">{post.readTime} lectura</span>
                                    </div>
                                    <h3 className="text-[14px] font-bold text-white mb-2 leading-snug group-hover:text-blue-200 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 leading-relaxed mb-4 line-clamp-2">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-slate-600">{post.date}</span>
                                        <span className="text-[12px] text-blue-400 font-semibold group-hover:text-blue-300 transition-colors">
                                            Leer →
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
