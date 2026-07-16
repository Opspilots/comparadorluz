import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, Zap, TrendingUp, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { LandingButton } from '@/features/auth/components/landing/ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

function HeroVisual() {
    const wrapRef = useRef<HTMLDivElement>(null)
    const tiltRef = useRef<HTMLDivElement>(null)
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    // Assume a fine pointer (mouse) until proven otherwise — avoids a flash of
    // the wrong interaction mode on mount, and this is a SPA (no SSR mismatch).
    const [isFinePointer, setIsFinePointer] = useState(true)

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
        setIsFinePointer(window.matchMedia('(pointer: fine)').matches)
    }, [])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        setTilt({
            x: ((e.clientY - cy) / rect.height) * 8,
            y: -((e.clientX - cx) / rect.width) * 8,
        })
    }

    // Touch/coarse-pointer devices never fire mousemove, so the tilt above is
    // invisible to roughly half the traffic. Give them a scroll-driven
    // alternative instead: a subtle, continuous tilt tied to how far the
    // mockup has travelled through the viewport, so it still "comes alive"
    // without depending on hover.
    useGSAP(() => {
        if (isFinePointer || prefersReducedMotion() || !tiltRef.current) return

        gsap.fromTo(
            tiltRef.current,
            { rotateX: 5, rotateY: -8 },
            {
                rotateX: -3,
                rotateY: 7,
                ease: 'none',
                scrollTrigger: {
                    trigger: tiltRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.4,
                },
            }
        )
    }, { scope: wrapRef, dependencies: [isFinePointer] })

    const rows = [
        { name: 'Endesa Green Plus', price: '0.118€', saving: '24%', w: '84%', best: true },
        { name: 'Holaluz Empresa', price: '0.126€', saving: '15%', w: '60%', best: false },
        { name: 'Naturgy Pyme 24h', price: '0.138€', saving: '6%', w: '36%', best: false },
    ]

    return (
        <div
            ref={wrapRef}
            className="hero-visual relative w-full max-w-[480px] md:max-w-[320px] lg:max-w-[460px] xl:max-w-[560px] mx-auto lg:mx-0"
            style={{ perspective: '1000px' }}
            onMouseMove={isFinePointer ? handleMouseMove : undefined}
            onMouseLeave={isFinePointer ? () => setTilt({ x: 0, y: 0 }) : undefined}
        >
            <div
                ref={tiltRef}
                className="relative"
                style={{
                    transform: isFinePointer ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
                    transition: isFinePointer ? 'transform 0.15s ease-out' : undefined,
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Preview label */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Vista previa del comparador</span>
                </div>

                {/* Glow backdrop */}
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at 60% 40%, rgba(37,99,235,0.12) 0%, transparent 70%)',
                        filter: 'blur(20px)',
                        transform: 'scale(1.1)',
                    }}
                />

                {/* Main card */}
                <div
                    className="relative rounded-2xl p-6"
                    style={{
                        background: 'var(--landing-bg-elevated)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        backdropFilter: 'blur(24px)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
                    }}
                >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                            <div className="text-[11px] font-bold text-slate-500 tracking-[0.1em] uppercase mb-0.5">Comparativa activa</div>
                            <div className="text-[14px] font-semibold text-white">Aceros Bilbao S.L.</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] text-slate-600 mb-0.5">47.2 MWh/año</div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[11px] text-emerald-400 font-semibold">En tiempo real</span>
                            </div>
                        </div>
                    </div>

                    {/* Comparison rows */}
                    <div className="space-y-3 mb-4">
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className={`rounded-xl p-3.5 transition-all duration-200 ${r.best ? 'border border-blue-500/25' : ''}`}
                                style={{ background: r.best ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.025)' }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {r.best && (
                                            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 border border-blue-400/25 px-1.5 py-0.5 rounded tracking-wide">MEJOR</span>
                                        )}
                                        <span className="text-[12px] font-semibold text-white">{r.name}</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-emerald-400">–{r.saving}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: r.w,
                                                background: r.best
                                                    ? 'linear-gradient(90deg, #2563eb, #10b981)'
                                                    : 'rgba(255,255,255,0.18)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-500 w-[54px] text-right tabular-nums">{r.price}/kWh</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Savings summary */}
                    <div
                        className="flex items-center justify-between rounded-xl p-3"
                        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}
                    >
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={2} aria-hidden="true" />
                            <span className="text-[13px] font-semibold text-emerald-300">Ahorro estimado</span>
                        </div>
                        <span className="text-[17px] font-extrabold text-emerald-400 tracking-tight tabular-nums">2.847€/año</span>
                    </div>
                </div>

                {/* Floating speed badge */}
                <div
                    className="animate-float-card absolute -bottom-5 -left-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                        background: 'var(--landing-bg-elevated)',
                        border: '1px solid rgba(37,99,235,0.3)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.1)',
                    }}
                >
                    <Zap className="w-3.5 h-3.5 text-blue-400" strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-white">Generado en 1.4s</span>
                </div>

                {/* Floating contracts badge */}
                <div
                    className="animate-float-card absolute -top-4 -right-4 z-10 rounded-xl p-3 text-right"
                    style={{
                        background: 'var(--landing-bg-elevated)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animationDuration: '3.5s',
                        animationDelay: '0.5s',
                    }}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
                        <span className="text-[13px] font-extrabold text-white">+12</span>
                    </div>
                    <div className="text-[9px] text-slate-500">contratos este mes</div>
                </div>

                {/* Floating pending badge */}
                <div
                    className="animate-float-card absolute top-1/2 -right-8 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{
                        background: 'var(--landing-bg-elevated)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        animationDuration: '4s',
                        animationDelay: '1s',
                    }}
                >
                    <Clock className="w-3 h-3 text-amber-400" strokeWidth={2} aria-hidden="true" />
                    <span className="text-[10px] font-semibold text-amber-400">2 pendientes</span>
                </div>
            </div>
        </div>
    )
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    const containerRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        if (prefersReducedMotion()) return

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        // The hero gets its own animation "signature" — a soft focus-pull on the
        // H1 (blur -> sharp) instead of the plain y/opacity fade the rest of the
        // sections use — plus a 3D swoop-in on the visual (scale+rotate, not just
        // a slide) so the mockup reads as dimensional even before any interaction.
        tl.from('.hero-badge', { opacity: 0, y: 14, scale: 0.94, duration: 0.5 })
          .fromTo('.hero-h1', { opacity: 0, y: 26, filter: 'blur(9px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7 }, '-=0.25')
          .from('.hero-sub', { opacity: 0, y: 18, duration: 0.55 }, '-=0.35')
          .from('.hero-cta-1', { opacity: 0, x: -16, duration: 0.45 }, '-=0.2')
          .from('.hero-cta-2', { opacity: 0, x: -12, duration: 0.4 }, '-=0.3')
          .from('.hero-trust', { opacity: 0, duration: 0.4 }, '-=0.1')
          .fromTo(
              '.hero-visual',
              { opacity: 0, x: 36, scale: 0.92, rotateY: -8, rotateX: 3, transformPerspective: 800 },
              { opacity: 1, x: 0, scale: 1, rotateY: 0, rotateX: 0, duration: 0.85, ease: 'power2.out' },
              '-=0.75'
          )

        gsap.to('.hero-orb-1', {
            y: -80,
            scrollTrigger: { trigger: containerRef.current, start: 'top top', end: 'bottom top', scrub: 1.2 },
        })
        gsap.to('.hero-orb-2', {
            y: -50,
            scrollTrigger: { trigger: containerRef.current, start: 'top top', end: 'bottom top', scrub: 1.8 },
        })
        gsap.to('.hero-orb-3', {
            y: -100,
            scrollTrigger: { trigger: containerRef.current, start: 'top top', end: 'bottom top', scrub: 0.9 },
        })
    }, { scope: containerRef })

    return (
        <section
            ref={containerRef}
            className="relative overflow-x-hidden flex items-center px-[5%]"
            style={{ background: 'var(--landing-bg)', minHeight: '100dvh' }}
        >
            {/* Animated orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="hero-orb-1 orb-float-1 absolute top-[-10%] left-[5%] w-[700px] h-[700px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 65%)', filter: 'blur(40px)' }}
                />
                <div
                    className="hero-orb-2 orb-float-2 absolute top-[20%] right-[-5%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)', filter: 'blur(40px)' }}
                />
                <div
                    className="hero-orb-3 orb-float-3 absolute bottom-[5%] left-[20%] w-[400px] h-[400px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)', filter: 'blur(50px)' }}
                />
            </div>

            {/* Dot grid */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.6) 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                    opacity: 0.025,
                }}
            />

            {/* Content — padding-top matches the fixed header height + breathing room.
                Grid goes 1 col -> 2 (narrow, md:) -> 2 (full, lg:) instead of jumping
                straight from stacked to 2-col only at lg:, which used to push the CTA
                below the fold on tablets. */}
            <div
                className="relative z-10 w-full max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-[1.15fr_1fr] lg:grid-cols-2 gap-10 md:gap-8 lg:gap-16 items-center pb-16 lg:pb-20"
                style={{ paddingTop: 'calc(var(--header-h, 64px) + 40px)' }}
            >
                {/* Left: text */}
                <div className="flex flex-col">
                    {/* Eyebrow badge */}
                    <div
                        className="hero-badge inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full mb-8 w-fit"
                        style={{
                            background: 'rgba(37,99,235,0.08)',
                            border: '1px solid rgba(37,99,235,0.2)',
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-semibold text-blue-300/80 tracking-[0.06em] uppercase">
                            CRM para asesores energéticos
                        </span>
                    </div>

                    {/* H1 — uses the shared fluid --landing-h1 token/class instead of a
                        hand-written clamp(); values are unchanged (2.5rem -> 4.75rem). */}
                    <h1
                        className="hero-h1 landing-h1 font-extrabold text-white mb-6"
                        style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                        El CRM que Cierra<br />
                        más Contratos<br />
                        <span style={{ color: '#60a5fa' }}>de Energía</span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="hero-sub text-[1.05rem] text-slate-400 mb-10 leading-relaxed"
                        style={{ maxWidth: '520px', textWrap: 'pretty' } as React.CSSProperties}
                    >
                        Compara tarifas de luz y gas, gestiona clientes con CIF y CUPS, controla comisiones y comunícate por email y WhatsApp — desde una sola plataforma.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-10">
                        <LandingButton
                            size="lg"
                            icon={<ArrowRight strokeWidth={2.5} />}
                            onClick={() => onOpenAuth('signup')}
                            className="hero-cta-1"
                        >
                            Empezar gratis — sin tarjeta
                        </LandingButton>
                        <LandingButton variant="secondary" size="lg" asChild className="hero-cta-2">
                            <a href="#como-funciona">
                                <Zap className="w-4 h-4 text-blue-400" strokeWidth={2} aria-hidden="true" />
                                Ver cómo funciona
                            </a>
                        </LandingButton>
                    </div>

                    {/* Trust row — below sm: each stat becomes a small chip with its own
                        subtle background so items stay visually separated even without
                        the vertical divider (which only appears from sm: up). */}
                    <div className="hero-trust flex flex-wrap items-center gap-2 sm:gap-x-6 sm:gap-y-2.5">
                        {[
                            { icon: ShieldCheck, v: 'RGPD', l: 'compliant' },
                            { icon: null, v: '200+', l: 'tarifas disponibles' },
                            { icon: null, v: '< 2 min', l: 'por comparativa' },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full sm:px-0 sm:py-0 sm:rounded-none sm:bg-transparent"
                                style={{ background: 'rgba(255,255,255,0.035)' }}
                            >
                                {s.icon && <s.icon className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} aria-hidden="true" />}
                                <span className="text-white font-bold text-sm tracking-tight">{s.v}</span>
                                <span className="text-slate-500 text-sm">{s.l}</span>
                                {i < 2 && <div className="w-px h-3.5 bg-white/[0.08] hidden sm:block ml-1.5" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: product visual */}
                <div className="flex items-center justify-center lg:justify-end">
                    <HeroVisual />
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20" style={{ background: 'linear-gradient(to top, var(--landing-bg), transparent)' }} />
        </section>
    )
}
