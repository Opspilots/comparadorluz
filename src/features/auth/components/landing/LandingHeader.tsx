import { useEffect, useRef, useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/shared/lib/motion-preferences'
import { LandingButton } from '@/features/auth/components/landing/ui'

gsap.registerPlugin(useGSAP)

function EnergyPulseIcon({ className }: { className?: string }) {
    return (
        <svg
            width="30"
            height="18"
            viewBox="0 0 30 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M1 9 L7 9 L9.5 2 L12 16 L14.5 9 L17 9"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M17 9 L29 9"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.35"
            />
        </svg>
    )
}

interface LandingHeaderProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

// `tier: 'core'` links stay visible from `lg:` (1024px) up — the tablet range
// gets SOME anchor navigation instead of the previous logo+hamburger-only dead
// zone. `tier: 'more'` links only join at `xl:` (1280px) once there's room for
// all six without cramping the header. Because of that split, the hamburger
// menu (which lists ALL links, core + more) is kept mounted through the same
// `lg:`-`xl:` gap instead of disappearing at `lg:` — otherwise 1024-1279px would
// have no way to reach Integraciones/Blog. This trades a brief overlap (a few
// core links visible in both the inline nav and the hamburger panel between
// 1024-1279px) for guaranteed access, which is safer than widening the inline
// nav and risking it colliding with the logo/actions at 1024px.
const navLinks = [
    { label: 'Funcionalidades', href: '#funcionalidades', tier: 'core' as const },
    { label: 'Cómo funciona', href: '#como-funciona', tier: 'core' as const },
    { label: 'Integraciones', href: '#integraciones', tier: 'more' as const },
    { label: 'Precios', href: '#precios', tier: 'core' as const },
    { label: 'Blog', href: '#blog', tier: 'more' as const },
    { label: 'Contacto', href: '#contacto', tier: 'core' as const },
]

export function LandingHeader({ onOpenAuth }: LandingHeaderProps) {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const mobileNavRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    // Expose header height as CSS variable for hero section offset
    useEffect(() => {
        const update = () => {
            if (headerRef.current) {
                const h = headerRef.current.offsetHeight
                document.documentElement.style.setProperty('--header-h', `${h}px`)
            }
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    // Give the mobile menu some cinematic personality on open: the accordion
    // (max-height/opacity) transition still handles the container, this adds
    // a staggered reveal for the links themselves. Skipped entirely under
    // prefers-reduced-motion — the accordion alone still communicates state.
    useGSAP(() => {
        if (!mobileOpen || prefersReducedMotion()) return
        gsap.fromTo(
            '.mobile-nav-link',
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.045, ease: 'power2.out', delay: 0.08 }
        )
    }, { scope: mobileNavRef, dependencies: [mobileOpen] })

    useEffect(() => {
        if (!mobileOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [mobileOpen])

    return (
        <>
            <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
                <header
                    className="transition-all duration-300"
                    style={{
                        background: scrolled
                            ? 'rgba(3,5,20,0.92)'
                            : 'rgba(3,5,20,0.75)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: scrolled
                            ? '1px solid rgba(255,255,255,0.07)'
                            : '1px solid rgba(255,255,255,0.04)',
                        boxShadow: scrolled
                            ? '0 4px 32px rgba(0,0,0,0.4)'
                            : 'none',
                    }}
                >
                    <div className="flex items-center justify-between px-6 lg:px-6 xl:px-[5%] h-16 max-w-[1400px] mx-auto">

                        {/* Logo */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <EnergyPulseIcon />
                            <span className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-white">
                                Energy<span className="text-blue-400">Deal</span>
                            </span>
                        </div>

                        {/* Desktop nav — visible from lg: (1024px), all 6 links join at xl: (1280px) */}
                        <nav className="hidden lg:flex items-center gap-0.5" aria-label="Navegación principal">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className={`${link.tier === 'more' ? 'hidden xl:inline-flex' : 'inline-flex'} px-2.5 xl:px-3.5 py-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.05]`}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <LandingButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenAuth('login')}
                                className="hidden md:inline-flex"
                            >
                                Acceder
                            </LandingButton>
                            <LandingButton
                                variant="primary"
                                size="sm"
                                icon={<ArrowRight strokeWidth={2.5} />}
                                onClick={() => onOpenAuth('signup')}
                                className="hidden md:inline-flex"
                            >
                                Empezar gratis
                            </LandingButton>

                            {/* Mobile toggle — stays through xl: (not lg:) so the 1024-1279px
                                range keeps a way to reach the tier:'more' links (Integraciones,
                                Blog) that only join the inline nav at xl:. */}
                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className="xl:hidden bg-transparent border-none cursor-pointer text-slate-300 rounded-lg hover:bg-white/[0.06] transition-colors ml-1 flex items-center justify-center"
                                style={{ minWidth: '44px', minHeight: '44px' }}
                                aria-label="Menú"
                                aria-expanded={mobileOpen}
                                aria-controls="mobile-nav-menu"
                            >
                                {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu — mirrors the xl: cutoff on the toggle button above */}
                    <div
                        id="mobile-nav-menu"
                        ref={mobileNavRef}
                        className={`xl:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'}`}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <nav className="flex flex-col px-6 pb-6 pt-3 gap-0.5" aria-label="Navegación móvil">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="mobile-nav-link py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors border-b border-white/[0.04] last:border-0"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="mobile-nav-link flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <LandingButton
                                    variant="secondary"
                                    size="md"
                                    fullWidth
                                    onClick={() => { onOpenAuth('login'); setMobileOpen(false) }}
                                >
                                    Acceder
                                </LandingButton>
                                <LandingButton
                                    variant="primary"
                                    size="md"
                                    fullWidth
                                    onClick={() => { onOpenAuth('signup'); setMobileOpen(false) }}
                                >
                                    Empezar gratis
                                </LandingButton>
                            </div>
                        </nav>
                    </div>
                </header>
            </div>

            {/* Backdrop dim + blur behind the mobile menu — gives the open state some
                weight instead of a bare accordion, and doubles as a click-outside-to-close
                target. Sits below the header's z-50 so the panel itself stays crisp. */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 xl:hidden transition-opacity duration-300"
                    style={{
                        top: 'var(--header-h, 64px)',
                        background: 'rgba(2,2,9,0.6)',
                        backdropFilter: 'blur(3px)',
                    }}
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}
        </>
    )
}
