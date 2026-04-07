import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { loginSchema, signupSchema, getFirstZodError } from '@/shared/lib/validations'
import { LandingHeader } from './landing/LandingHeader'
import { HeroSection } from './landing/HeroSection'
import { StatsSection } from './landing/StatsSection'
import { FeaturesSection } from './landing/FeaturesSection'
import { HowItWorksSection } from './landing/HowItWorksSection'
import { IntegrationsSection } from './landing/IntegrationsSection'
import { TestimonialsSection } from './landing/TestimonialsSection'
import { PricingSection } from './landing/PricingSection'
import { BlogSection } from './landing/BlogSection'
import { FAQSection } from './landing/FAQSection'
import { ContactSection } from './landing/ContactSection'
import { CTASection } from './landing/CTASection'
import { LandingFooter } from './landing/LandingFooter'
import { AuthModal } from './landing/AuthModal'

export function Login() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [isError, setIsError] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        setIsError(false)

        const validation = loginSchema.safeParse({ email, password })
        if (!validation.success) {
            setIsError(true)
            setMessage(getFirstZodError(validation) ?? 'Error de validación')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setIsError(true)
            setMessage('Credenciales incorrectas. Comprueba tu email y contraseña.')
        } else {
            setIsError(false)
            setMessage('Sesion iniciada correctamente.')
            navigate('/')
        }
        setLoading(false)
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        setIsError(false)

        const validation = signupSchema.safeParse({ email, password })
        if (!validation.success) {
            setIsError(true)
            setMessage(getFirstZodError(validation) ?? 'Error de validación')
            setLoading(false)
            return
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('No se pudo crear el usuario.')

            const randomCif = `A${Math.floor(Math.random() * 90000000 + 10000000)}`
            const companyName = `Empresa de ${email.split('@')[0]}`

            const { error: rpcError } = await supabase.rpc('create_company_with_user', {
                p_user_id: authData.user.id,
                p_email: email,
                p_company_name: companyName,
                p_cif: randomCif,
            })

            if (rpcError) throw rpcError

            setIsError(false)
            setMessage('Cuenta creada! Se ha configurado tu empresa automaticamente. Ya puedes iniciar sesion.')
            setAuthMode('login')
        } catch (error) {
            const err = error as Error
            setIsError(true)
            setMessage('No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.')
            console.error(err)
            // Sign out to prevent orphaned auth user without company data
            await supabase.auth.signOut()
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        setMessage(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            })
            if (error) throw error
        } catch (error) {
            const err = error as Error
            setIsError(true)
            setMessage('Error al iniciar sesion con Google. Intenta de nuevo.')
            console.error(err)
            setLoading(false)
        }
    }

    const openAuth = (mode: 'login' | 'signup') => {
        setAuthMode(mode)
        setShowAuthModal(true)
        setMessage(null)
    }

    return (
        <div className="min-h-screen overflow-x-hidden scroll-smooth" style={{ background: '#020209' }}>
            <LandingHeader onOpenAuth={openAuth} />
            <HeroSection onOpenAuth={openAuth} />
            <StatsSection />
            <FeaturesSection />
            <HowItWorksSection />
            <IntegrationsSection />
            <TestimonialsSection />
            <PricingSection onOpenAuth={openAuth} />
            <BlogSection />
            <FAQSection />
            <ContactSection />
            <CTASection onOpenAuth={openAuth} />
            <LandingFooter />
            <AuthModal
                open={showAuthModal}
                onOpenChange={setShowAuthModal}
                authMode={authMode}
                setAuthMode={setAuthMode}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                loading={loading}
                message={message}
                isError={isError}
                onSubmit={authMode === 'login' ? handleLogin : handleSignUp}
                onGoogleLogin={handleGoogleLogin}
            />
        </div>
    )
}
