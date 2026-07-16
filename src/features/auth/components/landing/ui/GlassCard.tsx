import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6 lg:p-7',
    lg: 'p-7 lg:p-8',
} as const

const hoverMap = {
    none: '',
    lift: 'landing-hover-lift',
    glow: 'transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(37,99,235,0.18)]',
} as const

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Enables the cursor-tracked radial glow (reuses `.spotlight-card` from
     * src/index.css — the same effect FeaturesSection currently re-implements
     * locally via its own `useSpotlight` hook). On coarse-pointer/touch
     * devices the mousemove tracking is skipped automatically and the card
     * falls back to the CSS default (a static centered glow on tap/hover),
     * so no extra prop is needed to opt out on mobile.
     * Default: false (renders `.glass-card-v2` instead — static glass, no glow).
     */
    spotlight?: boolean
    padding?: keyof typeof paddingMap
    /**
     * - 'none': no hover transform, only the base border/bg transition already on the glass classes.
     * - 'lift': translateY(-6px) on hover (`.landing-hover-lift`) — use for clickable/interactive cards.
     * - 'glow': soft blue shadow bloom on hover — use for cards that should feel "selected" rather than "raised".
     */
    hover?: keyof typeof hoverMap
    /** Semantic tag override — e.g. 'article' for blog/feature cards, 'li' inside a <ul> grid. */
    as?: 'div' | 'article' | 'li'
}

/**
 * GlassCard — shared glass-surface card for the public landing page.
 *
 * Consolidates the `.landing-card-premium` / `.glass-card-v2` / `.spotlight-card`
 * patterns currently copy-pasted (with a locally re-declared `useSpotlight` hook)
 * inside FeaturesSection, PricingSection, TestimonialsSection, IntegrationsSection
 * and BlogSection. Do NOT use inside the logged-in app — use
 * `@/shared/components/ui/card` there instead.
 *
 * @example Static feature card (grid layout)
 * ```tsx
 * <GlassCard className="rounded-2xl overflow-hidden">
 *   <FeatureMockup />
 * </GlassCard>
 * ```
 *
 * @example Spotlight card that lifts on hover (feature grid item)
 * ```tsx
 * <GlassCard spotlight hover="lift" className="rounded-2xl">
 *   <h3>{feature.title}</h3>
 * </GlassCard>
 * ```
 *
 * @example Pricing tier card, no spotlight, glow on hover
 * ```tsx
 * <GlassCard hover="glow" padding="lg" className="rounded-2xl text-left">
 *   {tier.name}
 * </GlassCard>
 * ```
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, spotlight = false, padding = 'md', hover = 'none', as = 'div', onMouseMove, children, ...props }, ref) => {
        const innerRef = React.useRef<HTMLDivElement | null>(null)
        const pointerFineRef = React.useRef<boolean | null>(null)

        const setRefs = React.useCallback((node: HTMLDivElement | null) => {
            innerRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }, [ref])

        const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
            if (pointerFineRef.current === null) {
                pointerFineRef.current = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
                    ? window.matchMedia('(pointer: fine)').matches
                    : true
            }
            if (pointerFineRef.current && innerRef.current) {
                const rect = innerRef.current.getBoundingClientRect()
                innerRef.current.style.setProperty('--sx', `${e.clientX - rect.left}px`)
                innerRef.current.style.setProperty('--sy', `${e.clientY - rect.top}px`)
            }
            onMouseMove?.(e)
        }, [onMouseMove])

        const Comp = as as React.ElementType

        return (
            <Comp
                ref={setRefs}
                className={cn(
                    spotlight ? 'spotlight-card' : 'glass-card-v2',
                    paddingMap[padding],
                    hoverMap[hover],
                    className
                )}
                onMouseMove={spotlight ? handleMouseMove : onMouseMove}
                {...props}
            >
                {children}
            </Comp>
        )
    }
)
GlassCard.displayName = 'GlassCard'
