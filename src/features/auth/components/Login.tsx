import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export function Login() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
    const [scrolled, setScrolled] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const [showVideo, setShowVideo] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)

        // Add global animations styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }
            .animate-fade-in {
                animation: fadeIn 0.8s ease-out forwards;
            }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .hover-lift {
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .hover-lift:hover {
                transform: translateY(-8px);
            }
            @keyframes scan {
                0% { transform: translateY(0); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(500px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.head.removeChild(style);
        }
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setMessage(`Error: ${error.message}`)
        } else {
            setMessage('Sesión iniciada correctamente.')
            window.location.href = '/'
        }
        setLoading(false)
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('No se pudo crear el usuario.')

            const randomCif = `A${Math.floor(Math.random() * 90000000 + 10000000)}`;
            const companyName = `Empresa de ${email.split('@')[0]}`;

            const { error: rpcError } = await supabase.rpc('create_company_with_user', {
                p_user_id: authData.user.id,
                p_email: email,
                p_company_name: companyName,
                p_cif: randomCif
            })

            if (rpcError) throw rpcError

            setMessage('¡Cuenta creada! Se ha configurado tu empresa automáticamente. Ya puedes iniciar sesión.')
            setAuthMode('login')
        } catch (error) {
            const err = error as Error
            setMessage(`Error: ${err.message}`)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const openAuth = (mode: 'login' | 'signup') => {
        setAuthMode(mode)
        setShowAuthModal(true)
        setMessage(null)
    }

    const pricingTiers = [
        {
            name: 'Gratis',
            monthly: 0,
            yearly: 0,
            features: ['Gestión Manual', 'Sin IA / OCR', '1 Usuario', 'Comparador Básico'],
            cta: 'Empezar gratis',
            highlight: false
        },
        {
            name: 'Estándar',
            monthly: 19,
            yearly: 17,
            features: ['CRM Energético', '100 usos IA/mes', '50 suministros', 'Soporte Email', 'Informes PDF'],
            cta: 'Elegir Estándar',
            highlight: false
        },
        {
            name: 'Profesional',
            monthly: 49,
            yearly: 44,
            features: ['Todo ilimitado', 'IA & OCR sin límites', 'Soporte 24/7 VIP', 'Analítica Avanzada', 'API access'],
            cta: 'Plan Profesional',
            highlight: true
        }
    ]

    return (
        <div style={{
            fontFamily: "'Inter', sans-serif",
            color: 'var(--text-primary)',
            backgroundColor: 'var(--background)',
            minHeight: '100vh',
            scrollBehavior: 'smooth',
            overflowX: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1.25rem 5%',
                transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.75)' : 'transparent',
                backdropFilter: scrolled ? 'blur(16px)' : 'none',
                boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.05)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : 'none'
            }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.03em' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                        borderRadius: '10px',
                        transform: 'rotate(-5deg)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}></div>
                    EnergyDeal
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <button
                        onClick={() => openAuth('login')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer', opacity: 0.8 }}
                    >
                        Acceder
                    </button>
                    <button
                        onClick={() => openAuth('signup')}
                        style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            padding: '0.7rem 1.4rem',
                            borderRadius: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        Empezar gratis
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section style={{
                padding: '180px 5% 120px',
                textAlign: 'center',
                position: 'relative',
                background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, transparent 100%)'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '1000px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
                    zIndex: -1
                }}></div>

                <div className="animate-fade-in">
                    <div style={{
                        display: 'inline-block',
                        padding: '0.4rem 1rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary)',
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        marginBottom: '2rem'
                    }}>
                        ✨ El CRM de energía número #1 en España
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: '900', lineHeight: 1, marginBottom: '1.5rem', letterSpacing: '-0.04em' }}>
                        Transforma tu asesoría <br />
                        <span style={{
                            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 4px 10px rgba(59, 130, 246, 0.2))'
                        }}>con Inteligencia Artificial</span>
                    </h1>
                    <p style={{ fontSize: '1.35rem', color: 'var(--text-muted)', maxWidth: '750px', margin: '0 auto 3rem', lineHeight: 1.6, opacity: 0.9 }}>
                        Sube facturas, analiza tarifas y genera contratos en segundos. EnergyDeal es la plataforma definitiva diseñada para el profesional energético del siglo XXI.
                    </p>
                    <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => openAuth('signup')}
                            style={{
                                padding: '1.2rem 2.8rem',
                                fontSize: '1.1rem',
                                borderRadius: '16px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                fontWeight: '800',
                                cursor: 'pointer',
                                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            Pruébalo ahora
                        </button>
                        <button
                            onClick={() => setShowVideo(true)}
                            style={{
                                padding: '1.2rem 2.8rem',
                                fontSize: '1.1rem',
                                borderRadius: '16px',
                                background: 'white',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                            }}>
                            Ver vídeo demo
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: 'var(--primary)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '0.8rem'
                            }}>▶</div>
                        </button>
                    </div>
                </div>

                {/* Hero Asset Mockup */}
                <div className="animate-fade-in delay-3" style={{ marginTop: '80px', position: 'relative' }}>
                    <div style={{
                        maxWidth: '1000px',
                        margin: '0 auto',
                        background: 'rgba(255, 255, 255, 0.5)',
                        padding: '12px',
                        borderRadius: '32px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{
                            background: '#0f172a',
                            borderRadius: '24px',
                            height: '500px',
                            overflow: 'hidden',
                            display: 'flex',
                            position: 'relative'
                        }}>
                            <div style={{ width: '100%', height: '100%', background: '#0f172a', padding: '2rem', display: 'flex', gap: '2rem' }}>
                                {/* Sidebar Mockup */}
                                <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} style={{ height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}></div>
                                    ))}
                                </div>
                                {/* Main Content Mockup */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ height: '100px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}></div>
                                        ))}
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem' }}>
                                        <div style={{ width: '100%', height: '200px', background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.1) 50%, transparent 100%)', borderRadius: '12px' }}></div>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative elements */}
                            <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>AHORRO DETECTADO</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>+12.4%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Metodo Section */}
            <section style={{ padding: '120px 5%', backgroundColor: '#0f172a', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '10%',
                    width: '300px',
                    height: '300px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    filter: 'blur(100px)',
                    borderRadius: '50%'
                }}></div>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    <h2 style={{
                        fontSize: '3.5rem',
                        fontWeight: '900',
                        marginBottom: '5rem',
                        letterSpacing: '-0.04em',
                        color: 'white',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        background: 'linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>Nuestro Método de 4 pasos</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
                        {[
                            { step: '01', title: 'Carga Inteligente', desc: 'Nuestra IA lee cualquier factura en segundos, sin errores manuales.' },
                            { step: '02', title: 'Análisis Profundo', desc: 'Comparamos contra +200 comercializadoras en tiempo real.' },
                            { step: '03', title: 'Optimización', desc: 'Generamos la propuesta más económica para tu cliente.' },
                            { step: '04', title: 'Cierre Digital', desc: 'Firma y envío de contrato automático desde el CRM.' }
                        ].map((item, i) => (
                            <div key={i} className="hover-lift" style={{ textAlign: 'left', padding: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{
                                    fontSize: '4.5rem',
                                    fontWeight: '900',
                                    opacity: 0.1,
                                    marginBottom: '-2.5rem',
                                    color: '#3b82f6',
                                    fontFamily: 'monospace'
                                }}>{item.step}</div>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '1rem', position: 'relative' }}>{item.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.5 }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section style={{ padding: '120px 5%', textAlign: 'center', background: 'var(--surface)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Elige tu plan</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3.5rem' }}>Gestión eficiente para asesores de cualquier tamaño.</p>

                    {/* Billing Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1.5rem',
                        marginBottom: '4rem'
                    }}>
                        <span style={{ fontWeight: '600', opacity: billingCycle === 'monthly' ? 1 : 0.5 }}>Mensual</span>
                        <div
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            style={{
                                width: '60px',
                                height: '32px',
                                background: 'var(--primary)',
                                borderRadius: '50px',
                                position: 'relative',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: 'white',
                                borderRadius: '50%',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: billingCycle === 'yearly' ? 'translateX(28px)' : 'translateX(0)'
                            }}></div>
                        </div>
                        <span style={{ fontWeight: '600', opacity: billingCycle === 'yearly' ? 1 : 0.5 }}>
                            Anual <span style={{ color: '#10b981', marginLeft: '6px' }}>(Ahorra 10%)</span>
                        </span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '2.5rem',
                        perspective: '1000px'
                    }}>
                        {pricingTiers.map((tier, i) => (
                            <div
                                key={i}
                                className="hover-lift"
                                style={{
                                    background: 'white',
                                    borderRadius: '32px',
                                    padding: '3.5rem 2.5rem',
                                    border: tier.highlight ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: tier.highlight ? '0 30px 60px rgba(59, 130, 246, 0.12)' : '0 20px 40px rgba(0,0,0,0.03)',
                                    position: 'relative',
                                    zIndex: tier.highlight ? 2 : 1
                                }}
                            >
                                {tier.highlight && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-15px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        padding: '0.4rem 1.2rem',
                                        borderRadius: '50px',
                                        fontSize: '0.8rem',
                                        fontWeight: '800'
                                    }}>
                                        RECOMENDADO
                                    </div>
                                )}
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>{tier.name}</h3>
                                <div style={{ fontSize: '3.8rem', fontWeight: '900', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                                    {billingCycle === 'monthly' ? tier.monthly : tier.yearly}€
                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>/mes</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '3rem' }}>
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} style={{ padding: '0.6rem 0', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                            <div style={{ color: '#10b981', fontWeight: '900' }}>✓</div>
                                            <span style={{ opacity: 0.9 }}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => openAuth('signup')}
                                    style={{
                                        width: '100%',
                                        padding: '1.1rem',
                                        borderRadius: '16px',
                                        background: tier.highlight ? 'var(--primary)' : 'white',
                                        color: tier.highlight ? 'white' : 'var(--text-primary)',
                                        border: tier.highlight ? 'none' : '2px solid var(--border)',
                                        fontWeight: '800',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tier.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section style={{ padding: '100px 5%', textAlign: 'center', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: 'white' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '1.5rem' }}>¿Listo para el siguiente nivel?</h2>
                    <p style={{ fontSize: '1.3rem', marginBottom: '3rem', opacity: 0.9 }}>Únete a los más de 500 asesores que ya confían en EnergyDeal.</p>
                    <button
                        onClick={() => openAuth('signup')}
                        style={{ padding: '1.2rem 3rem', background: 'white', color: '#3b82f6', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}
                    >
                        Empezar gratis ahora
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '5rem 5%', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', borderRadius: '8px' }}></div>
                        EnergyDeal
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        <a href="#">Privacidad</a>
                        <a href="#">Términos</a>
                        <a href="#">Contacto</a>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        © {new Date().getFullYear()} EnergyDeal CRM. Made for pros.
                    </div>
                </div>
            </footer>

            {/* Video Modal Simulation */}
            {showVideo && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '1000px',
                        aspectRatio: '16/9',
                        background: '#000',
                        borderRadius: '24px',
                        position: 'relative',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <button
                            onClick={() => setShowVideo(false)}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', color: 'white', fontSize: '1.5rem', zIndex: 10 }}
                        >
                            ×
                        </button>

                        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                            <img
                                src="file:///C:/Users/pelay/.gemini/antigravity/brain/b9c8fc84-1496-4a9d-a296-86646a0e95df/energy_ai_dashboard_video_frame_1771273921218.png"
                                alt="Demo Preview"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: 0.6,
                                    animation: 'float 20s infinite linear'
                                }}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />

                            {/* Cinematic Overlay */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(rgba(15,23,42,0) 0%, rgba(15,23,42,0.8) 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2rem',
                                padding: '2rem'
                            }}>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    <div style={{
                                        width: '0',
                                        height: '0',
                                        borderTop: '15px solid transparent',
                                        borderBottom: '15px solid transparent',
                                        borderLeft: '25px solid white',
                                        marginLeft: '5px'
                                    }}></div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.02em', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>EnergyDeal: La Revolución</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                                        Optimización en tiempo real con IA. Mira cómo transformamos la gestión energética.
                                    </p>
                                </div>

                                {/* AI Scanning Effect */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
                                    boxShadow: '0 0 20px #3b82f6',
                                    animation: 'scan 4s infinite linear'
                                }}></div>
                            </div>
                        </div>

                        {/* Video Controls Bar Mockup */}
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', boxShadow: '0 0 10px #3b82f6' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Modal (Same as before but improved) */}
            {showAuthModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '460px',
                        borderRadius: '28px',
                        padding: '3rem 2.5rem',
                        boxShadow: '0 30px 70px -10px rgba(0,0,0,0.3)',
                        position: 'relative',
                        animation: 'fadeIn 0.4s ease-out'
                    }}>
                        <button
                            onClick={() => setShowAuthModal(false)}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            ×
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '14px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: '900' }}>E</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
                                {authMode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}
                            </h2>
                        </div>

                        {message && (
                            <div style={{
                                padding: '1rem',
                                background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                                color: message.startsWith('Error') ? '#991b1b' : '#166534',
                                borderRadius: '14px',
                                marginBottom: '1.5rem',
                                fontSize: '0.95rem',
                                border: `1px solid ${message.startsWith('Error') ? '#fee2e2' : '#dcfce7'}`
                            }}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>Email profesional</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@empresa.com"
                                    required
                                    style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '14px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: '#f8fafc' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '14px', border: '1px solid var(--border)', outline: 'none', fontSize: '1rem', background: '#f8fafc' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="hover-lift"
                                style={{
                                    padding: '1.1rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontWeight: '800',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    marginTop: '0.5rem',
                                    boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                {loading ? 'Procesando...' : (authMode === 'login' ? 'Entrar' : 'Registrarme')}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                                    {authMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya eres usuario? '}
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                                    >
                                        {authMode === 'login' ? 'Únete gratis' : 'Accede aquí'}
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
