import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * LandingButton — shared CTA button for the public (dark, cinematic) landing page.
 *
 * Replaces the hand-rolled `<button className="...px-7 py-3.5 rounded-xl bg-[#2563eb]...">`
 * / `<a className="...">` markup duplicated across HeroSection, PricingSection,
 * CTASection, ContactSection and LandingHeader. Do NOT use this inside the
 * logged-in app — use `@/shared/components/ui/button` there instead; the two
 * design systems intentionally diverge (light dashboard vs. dark marketing site).
 *
 * Relies on --landing-* tokens and the `.landing-glow-blue` / `.btn-directional`
 * utility classes already defined in src/index.css (LANDING sections).
 *
 * @example Primary CTA with trailing icon (Hero, CTA section)
 * ```tsx
 * <LandingButton size="lg" icon={<ArrowRight />} onClick={() => onOpenAuth('signup')}>
 *   Empezar gratis — sin tarjeta
 * </LandingButton>
 * ```
 *
 * @example Secondary CTA rendered as an anchor (Hero "Ver cómo funciona")
 * ```tsx
 * <LandingButton variant="secondary" size="lg" asChild>
 *   <a href="#como-funciona">
 *     <Zap className="w-4 h-4 text-blue-400" /> Ver cómo funciona
 *   </a>
 * </LandingButton>
 * ```
 * Note: when `asChild` is true, compose the icon manually inside the child
 * element — the `icon`/`iconPosition`/`loading` props only apply to the
 * default `<button>` render path (Radix Slot requires a single child element,
 * so it can't also inject icon wrapper spans around it).
 *
 * @example Full-width pricing tier CTA
 * ```tsx
 * <LandingButton variant={tier.highlight ? 'primary' : 'secondary'} fullWidth size="md">
 *   {tier.cta}
 * </LandingButton>
 * ```
 *
 * @example Ghost nav link button (LandingHeader "Acceder")
 * ```tsx
 * <LandingButton variant="ghost" size="sm" onClick={() => onOpenAuth('login')}>
 *   Acceder
 * </LandingButton>
 * ```
 */
const landingButtonVariants = cva(
    [
        'group relative inline-flex items-center justify-center gap-2.5 cursor-pointer',
        'rounded-xl border-none font-bold whitespace-nowrap',
        'transition-all duration-300 ease-out active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020209]',
    ].join(' '),
    {
        variants: {
            variant: {
                primary: 'text-white landing-glow-blue btn-directional bg-[#2563eb] hover:bg-[#3b82f6]',
                secondary: 'text-slate-300 hover:text-white bg-white/[0.04] border border-white/[0.09] hover:bg-white/[0.07]',
                ghost: 'text-slate-400 hover:text-white bg-transparent font-medium hover:bg-white/[0.05]',
            },
            size: {
                sm: 'px-4 py-2 text-[13px] rounded-lg gap-2',
                md: 'px-6 py-3 text-[14px]',
                lg: 'px-7 py-3.5 text-[14px] sm:px-8 sm:py-4 sm:text-[15px]',
            },
            fullWidth: {
                true: 'w-full',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'lg',
            fullWidth: false,
        },
    }
)

export interface LandingButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof landingButtonVariants> {
    /** Render as the single child element (e.g. an `<a>`) via Radix Slot instead of a `<button>`. */
    asChild?: boolean
    /** Icon element (e.g. a lucide-react icon). Ignored when `asChild` is true — compose it in the child instead. */
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
    /** Shows a spinner in place of the icon and disables the button. Ignored when `asChild` is true. */
    loading?: boolean
}

export const LandingButton = React.forwardRef<HTMLButtonElement, LandingButtonProps>(
    ({ className, variant, size, fullWidth, asChild = false, icon, iconPosition = 'right', loading = false, disabled, children, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                ref={ref}
                disabled={asChild ? undefined : disabled || loading}
                aria-busy={asChild ? undefined : (loading || undefined)}
                className={cn(landingButtonVariants({ variant, size, fullWidth, className }))}
                {...props}
            >
                {asChild ? children : (
                    <>
                        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {!loading && icon && iconPosition === 'left' && (
                            <span className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                        )}
                        {children}
                        {!loading && icon && iconPosition === 'right' && (
                            <span className="inline-flex shrink-0 transition-transform duration-300 group-hover:translate-x-1 [&>svg]:w-4 [&>svg]:h-4">
                                {icon}
                            </span>
                        )}
                    </>
                )}
            </Comp>
        )
    }
)
LandingButton.displayName = 'LandingButton'

// eslint-disable-next-line react-refresh/only-export-components
export { landingButtonVariants }
