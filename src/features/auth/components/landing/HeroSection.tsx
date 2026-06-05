import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, Zap, TrendingUp, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

function HeroVisual() {
    const [tilt, setTilt] = useState({ x: 0, y: 0 })

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        setTilt({
            x: ((e.clientY - cy) / rect.height) * 8,
            y: -((e.clientX - cx) / rect.width) * 8,
        })
    }

    const rows = [
        { name: 'Endesa Green Plus', price: '0.118€', saving: '24%', w: '84%', best: true },
        { name: 'Holaluz Empresa', price: '0.126€', saving: '15%', w: '60%', best: false },
        { name: 'Naturgy Pyme 24h', price: '0.138€', saving: '6%', w: '36%', best: false },
    ]

    return (
        <div
            className="hero-visual relative w-full max-w-[440px] mx-auto lg:mx-0"
            style={{ perspective: '1000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
            <div
                className="relative"
                style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: 'transform 0.15s ease-out',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Main card */}
                <div
                    className="relative rounded-2xl p-5"
                    style={{
                        background: 'rgba(8,8,24,0.9)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        backdropFilter: 'blur(24px)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
                    }}
                >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase mb-0.5">Comparativa activa</div>
                            <div className="text-[13px] font-semibold text-white">Aceros Bilbao S.L.</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-600 mb-0.5">47.2 MWh/año</div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] text-emerald-400 font-semibold">En tiempo real</span>
                            </div>
                        </div>
                    </div>

                    {/* Comparison rows */}
                    <div className="space-y-2.5 mb-4">
                        {rows.map((r, i) => (
                            <div
                                key={i}
                                className={`rounded-xl p-3 transition-all duration-200 ${r.best ? 'border border-blue-500/25' : ''}`}
                                style={{ background: r.best ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.025)' }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {r.best && (
                                            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 border border-blue-400/25 px-1.5 py-0.5 rounded tracking-wide">MEJOR</span>
                                        )}
                                        <span className="text-[11px] font-semibold text-white">{r.name}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-400">–{r.saving}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
                                    <span className="text-[10px] text-slate-500 w-[54px] text-right tabular-nums">{r.price}/kWh</span>
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
                            <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                            <span className="text-[12px] font-semibold text-emerald-300">Ahorro estimado</span>
                        </div>
                        <span className="text-[15px] font-extrabold text-emerald-400 tracking-tight tabular-nums">2.847€/año</span>
                    </div>
                </div>

                {/* Floating speed badge */}
                <div
                    className="absolute -bottom-4 -left-4 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                        background: 'rgba(8,8,24,0.95)',
                        border: '1px solid rgba(37,99,235,0.3)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.1)',
                        animation: 'floatCard 3s ease-in-out infinite',
                    }}
                >
                    <Zap className="w-3.5 h-3.5 text-blue-400" strokeWidth={2.5} fill="currentColor" />
                    <span className="text-[11px] font-bold text-white">Generado en 1.4s</span>
                </div>

                {/* Floating contracts badge */}
                <div
                    className="absolute -top-4 -right-4 rounded-xl p-3 text-right"
                    style={{
                        background: 'rgba(8,8,24,0.95)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animation: 'floatCard 3.5s ease-in-out infinite 0.5s',
                    }}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" strokeWidth={2.5} />
                        <span className="text-[13px] font-extrabold text-white">+12</span>
                    </div>
                    <div className="text-[9px] text-slate-500">contratos este mes</div>
                </div>

                {/* Floating pending badge */}
                <div
                    className="absolute top-1/2 -right-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{
                        background: 'rgba(8,8,24,0.95)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        animation: 'floatCard 4s ease-in-out infinite 1s',
                    }}
                >
                    <Clock className="w-3 h-3 text-amber-400" strokeWidth={2} />
                    <span className="text-[10px] font-semibold text-amber-400">2 pendientes</span>
                </div>
            </div>
        </div>
    )
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    const containerRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        tl.from('.hero-badge', { opacity: 0, y: 14, duration: 0.55 })
          .from('.hero-h1', { opacity: 0, y: 30, duration: 0.65 }, '-=0.25')
          .from('.hero-sub', { opacity: 0, y: 18, duration: 0.55 }, '-=0.3')
          .from('.hero-cta-1', { opacity: 0, x: -16, duration: 0.45 }, '-=0.2')
          .from('.hero-cta-2', { opacity: 0, x: -12, duration: 0.4 }, '-=0.3')
          .from('.hero-trust', { opacity: 0, duration: 0.4 }, '-=0.1')
          .from('.hero-visual', { opacity: 0, x: 36, duration: 0.75, ease: 'power2.out' }, '-=0.75')

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
            className="relative overflow-hidden flex items-center px-[5%]"
            style={{ background: '#020209', minHeight: '100dvh' }}
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

            {/* Content */}
            <div className="relative z-10 w-full max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center pt-28 pb-16 lg:py-0">
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

                    {/* H1 */}
                    <h1
                        className="hero-h1 font-extrabold leading-[1.04] tracking-[-0.04em] text-white mb-6"
                        style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', textWrap: 'balance' } as React.CSSProperties}
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
                        <button
                            onClick={() => onOpenAuth('signup')}
                            className="hero-cta-1 group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#2563eb] text-white font-bold text-[14px] cursor-pointer border-none btn-directional landing-glow-blue"
                        >
                            Empezar gratis — sin tarjeta
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                        </button>
                        <a
                            href="#como-funciona"
                            className="hero-cta-2 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-slate-300 font-semibold text-[14px] hover:text-white transition-all duration-300"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.09)',
                            }}
                        >
                            <Zap className="w-4 h-4 text-blue-400" strokeWidth={2} />
                            Ver cómo funciona
                        </a>
                    </div>

                    {/* Trust row */}
                    <div className="hero-trust flex flex-wrap items-center gap-x-6 gap-y-2.5">
                        {[
                            { icon: ShieldCheck, v: 'RGPD', l: 'compliant' },
                            { icon: null, v: '200+', l: 'tarifas disponibles' },
                            { icon: null, v: '< 2 min', l: 'por comparativa' },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                {s.icon && <s.icon className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />}
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
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020209] to-transparent pointer-events-none z-20" />
        </section>
    )
}
