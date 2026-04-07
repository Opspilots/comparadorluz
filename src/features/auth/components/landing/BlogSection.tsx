import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Calendar } from 'lucide-react'

function useInView(threshold = 0.1) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold }
        )
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [threshold])
    return { ref, visible }
}

const posts = [
    {
        category: 'Guía',
        catColor: '#2563eb',
        title: 'Cómo comparar tarifas de energía para empresas en el mercado libre',
        excerpt: 'Aprende a analizar el consumo de tus clientes empresariales y encontrar la tarifa de electricidad y gas más competitiva del mercado libre en 2026.',
        date: '2 Apr 2026',
        readTime: '8 min',
    },
    {
        category: 'CRM',
        catColor: '#7c3aed',
        title: 'Gestión de cartera de clientes para asesores energéticos: guía completa',
        excerpt: 'Descubre cómo organizar tu cartera con CIF y CUPS, automatizar el seguimiento de estados y aumentar tu tasa de conversión como asesor de energía.',
        date: '28 Mar 2026',
        readTime: '6 min',
    },
    {
        category: 'Negocio',
        catColor: '#059669',
        title: 'Por qué las corredurías de seguros están añadiendo energía a su oferta',
        excerpt: 'Las corredurías que incorporan la venta de tarifas energéticas están aumentando sus ingresos un 30% de media. Te explicamos cómo empezar.',
        date: '20 Mar 2026',
        readTime: '5 min',
    },
]

export function BlogSection() {
    const { ref, visible } = useInView(0.05)

    return (
        <section id="blog" className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                    <div>
                        <span className="inline-block text-[11px] font-bold text-blue-400/80 tracking-[0.14em] uppercase mb-5">
                            Blog y Recursos
                        </span>
                        <h2
                            className="text-3xl sm:text-4xl lg:text-[3rem] font-extrabold text-white tracking-[-0.03em]"
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

                <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {posts.map((post, i) => (
                        <article
                            key={i}
                            className="glass-card-v2 rounded-2xl overflow-hidden group cursor-pointer"
                            style={{
                                transition: `opacity 0.7s ease ${i * 100}ms, transform 0.7s ease ${i * 100}ms`,
                                opacity: visible ? 1 : 0,
                                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                            }}
                        >
                            {/* Color bar */}
                            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${post.catColor}, ${post.catColor}60)` }} />

                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="blog-tag" style={{ background: `${post.catColor}18`, color: post.catColor }}>
                                        {post.category}
                                    </span>
                                    <span className="text-[11px] text-slate-600">{post.readTime} lectura</span>
                                </div>

                                <h3 className="text-[15px] font-bold text-white mb-3 leading-snug tracking-[-0.01em] group-hover:text-blue-200 transition-colors">
                                    {post.title}
                                </h3>

                                <p className="text-[13px] text-slate-500 leading-relaxed mb-5 line-clamp-3">
                                    {post.excerpt}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                        <Calendar className="w-3 h-3" />
                                        <span>{post.date}</span>
                                    </div>
                                    <span className="text-[12px] text-blue-400 font-semibold group-hover:text-blue-300 transition-colors">
                                        Leer →
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
