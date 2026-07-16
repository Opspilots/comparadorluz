import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const headingSizeClass = {
    h1: 'landing-h1',
    h2: 'landing-h2',
    h3: 'landing-h3',
} as const

export interface SectionHeadingProps {
    /** Small uppercase eyebrow label above the title (e.g. "Funcionalidades del CRM Energético"). Omit to render just the title. */
    kicker?: string
    /** Accepts JSX so a portion can be highlighted, e.g. `<>Herramientas para <span style={{ color: 'var(--landing-accent-blue-soft)' }}>cerrar operaciones</span></>`. */
    title: React.ReactNode
    subtitle?: React.ReactNode
    align?: 'center' | 'left'
    /**
     * Heading level AND fluid size to use — controls both the rendered tag
     * (for correct document outline / a11y) and the `.landing-h1/h2/h3` size
     * class. Default 'h2' (section headings). Use 'h1' only for a page's
     * single top-level heading (the Hero keeps its own bespoke markup today;
     * this is here for when it's migrated to the shared component).
     */
    as?: keyof typeof headingSizeClass
    /** Caps the subtitle's line length for readability. Default '520px' (matches the current per-section values, which range 380px-500px). */
    subtitleMaxWidth?: string
    className?: string
    id?: string
}

/**
 * SectionHeading — shared "kicker + title + subtitle" pattern repeated at the
 * top of every landing section (Features, HowItWorks, Integrations, Pricing,
 * Blog, FAQ, Testimonials, Stats...). Uses the fluid `--landing-h1/h2/h3`
 * type scale from src/index.css instead of the discrete Tailwind breakpoint
 * jumps (`text-3xl sm:text-4xl lg:text-[3rem]`) each section hand-writes today.
 *
 * @example Centered section header (Features, Pricing, FAQ, ...)
 * ```tsx
 * <SectionHeading
 *   kicker="Funcionalidades del CRM Energético"
 *   title={<>Herramientas diseñadas para{' '}<span style={{ color: '#60a5fa' }}>cerrar operaciones</span></>}
 *   subtitle="Todo lo que un asesor energético necesita, sin complicaciones."
 *   subtitleMaxWidth="500px"
 * />
 * ```
 *
 * @example Left-aligned variant (e.g. a two-column section intro)
 * ```tsx
 * <SectionHeading align="left" as="h3" title="Precios" />
 * ```
 */
export function SectionHeading({
    kicker,
    title,
    subtitle,
    align = 'center',
    as = 'h2',
    subtitleMaxWidth = '520px',
    className,
    id,
}: SectionHeadingProps) {
    const Heading = as

    return (
        <div id={id} className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
            {kicker && (
                <span className="landing-kicker inline-block font-bold text-blue-400/70 uppercase mb-5">
                    {kicker}
                </span>
            )}
            <Heading
                className={cn(headingSizeClass[as], 'font-extrabold text-white')}
                style={{ textWrap: 'balance' } as React.CSSProperties}
            >
                {title}
            </Heading>
            {subtitle && (
                <p
                    className={cn('landing-body-lg text-slate-500 mt-4', align === 'center' && 'mx-auto')}
                    style={{ maxWidth: subtitleMaxWidth, textWrap: 'pretty' } as React.CSSProperties}
                >
                    {subtitle}
                </p>
            )}
        </div>
    )
}
