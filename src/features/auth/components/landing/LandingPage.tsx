import { LandingHeader } from './LandingHeader'
import { HeroSection } from './HeroSection'
import { StatsSection } from './StatsSection'
import { FeaturesSection } from './FeaturesSection'
import { MethodSection } from './MethodSection'
import { HowItWorksSection } from './HowItWorksSection'
import { IntegrationsSection } from './IntegrationsSection'
import { TestimonialsSection } from './TestimonialsSection'
import { PricingSection } from './PricingSection'
import { BlogSection } from './BlogSection'
import { FAQSection } from './FAQSection'
import { ContactSection } from './ContactSection'
import { CTASection } from './CTASection'
import { LandingFooter } from './LandingFooter'

export interface LandingPageProps {
    /** Opens the auth modal in the given mode. Passed straight through to every section that needs a CTA (Header, Hero, Pricing, CTA...). */
    onOpenAuth: (mode: 'login' | 'signup') => void
}

/**
 * LandingPage — pure visual composition of the public marketing site.
 *
 * Holds no auth/session state of its own; `Login.tsx` owns that and passes
 * down `onOpenAuth` so this tree stays a dumb, easily reusable layout.
 *
 * Section order follows a problem -> solution -> proof -> price -> close arc:
 * Hero/Stats set the stakes, Features/Method show the product (Method reuses
 * real product screenshots as deeper proof right after the feature list),
 * HowItWorks/Integrations explain the mechanics, Testimonials closes the
 * trust gap right before the pricing ask, then Blog/FAQ/Contact/CTA close
 * the page out.
 */
export function LandingPage({ onOpenAuth }: LandingPageProps) {
    return (
        <div className="min-h-screen overflow-x-hidden scroll-smooth" style={{ background: '#020209' }}>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-[#0f172a] focus:font-semibold focus:shadow-lg"
            >
                Saltar al contenido principal
            </a>
            <LandingHeader onOpenAuth={onOpenAuth} />
            <main id="main-content">
                <HeroSection onOpenAuth={onOpenAuth} />
                <StatsSection />
                <FeaturesSection />
                <MethodSection />
                <HowItWorksSection />
                <IntegrationsSection />
                <TestimonialsSection />
                <PricingSection onOpenAuth={onOpenAuth} />
                <BlogSection />
                <FAQSection />
                <ContactSection />
                <CTASection onOpenAuth={onOpenAuth} />
            </main>
            <LandingFooter />
        </div>
    )
}
