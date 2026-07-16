import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, Clock } from 'lucide-react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { GlassCard, LandingButton, SectionHeading } from './ui'

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
        if (prefersReducedMotion()) {
            gsap.set('.blog-card', { opacity: 1, y: 0, x: 0 })
            return
        }
        gsap.from('.blog-header', {
            opacity: 0, y: 24, duration: 0.5, ease: 'power3.out',
            scrollTrigger: { trigger: '.blog-header', start: 'top 85%', once: true },
        })
        // Featured post glides in from the left, the two smaller posts rise up with
        // their own stagger — gives the asymmetric grid its own entrance identity.
        ScrollTrigger.create({
            trigger: '.blog-card-featured',
            start: 'top 88%',
            once: true,
            onEnter: () => gsap.to('.blog-card-featured', { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }),
        })
        ScrollTrigger.batch('.blog-card-mini', {
            onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }),
            start: 'top 88%',
            once: true,
        })
    }, { scope: sectionRef })

    const featured = posts[0]
    const rest = posts.slice(1)

    return (
        <section ref={sectionRef} id="blog" className="relative py-28 lg:py-36 px-[5%] overflow-hidden" style={{ background: 'var(--landing-bg)' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1100px] mx-auto relative z-10">
                {/* Header row */}
                <div className="blog-header flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
                    <SectionHeading
                        align="left"
                        kicker="Blog y Recursos"
                        title={<>Recursos para el<br /><span className="gradient-text-bp">sector energético</span></>}
                    />
                    <LandingButton asChild variant="ghost" size="sm" className="flex-shrink-0">
                        <a href="/blog">
                            Ver todos los artículos
                            <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                        </a>
                    </LandingButton>
                </div>

                {/* Asymmetric grid — md:2-col intermediate step (full-width featured + 2-across
                    mini posts) before the lg:12-col asymmetric 7/5 desktop layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Featured post */}
                    <GlassCard
                        as="article"
                        padding="none"
                        hover="lift"
                        className="blog-card blog-card-featured md:col-span-2 lg:col-span-7 rounded-2xl overflow-hidden group cursor-pointer flex flex-col"
                        style={{
                            opacity: 0,
                            transform: 'translateX(-28px)',
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
                                    <Clock className="w-3 h-3" aria-hidden="true" />
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
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} aria-hidden="true" />
                                </span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Two smaller posts — sm:2-across, stacked again once inside the lg sidebar column */}
                    <div className="md:col-span-2 lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                        {rest.map((post, i) => (
                            <GlassCard
                                key={i}
                                as="article"
                                padding="none"
                                hover="lift"
                                className="blog-card blog-card-mini rounded-2xl overflow-hidden group cursor-pointer"
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
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
