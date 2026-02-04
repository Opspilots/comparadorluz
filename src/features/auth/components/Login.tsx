import React, { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

export function Login() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)

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

    const handleSignUp = async () => {
        setLoading(true)
        setMessage(null)

        try {
            // 1. Auth Signup
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('No se pudo crear el usuario.')

            // 2. Create Default Company
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .insert([{
                    name: `Empresa de ${email.split('@')[0]}`,
                    cif: `A${Math.floor(Math.random() * 90000000 + 10000000)}`,
                    email: email,
                }])
                .select()
                .single()

            if (companyError) throw companyError

            // 3. Create Public User Record
            const { error: userError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    company_id: companyData.id,
                    email: email,
                    full_name: 'Usuario Inicial',
                    role: 'admin'
                }])

            if (userError) throw userError

            setMessage('¡Cuenta creada! Se ha configurado tu empresa automáticamente. Ya puedes iniciar sesión.')
        } catch (error: any) {
            setMessage(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center' }}>EnergyDeal CRM</h2>
            <p style={{ textAlign: 'center', color: '#666' }}>Inicia sesión para gestionar tus tarifas</p>

            {message && (
                <div style={{ padding: '0.8rem', background: message.startsWith('Error') ? '#fee2e2' : '#dcfce7', color: message.startsWith('Error') ? '#991b1b' : '#166534', borderRadius: '4px', marginBottom: '1rem' }}>
                    {message}
                </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem' }}>Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '0.8rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {loading ? 'Cargando...' : 'Entrar'}
                </button>
                <button
                    type="button"
                    disabled={loading}
                    onClick={handleSignUp}
                    style={{ padding: '0.8rem', background: 'transparent', color: '#0070f3', border: '1px solid #0070f3', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Crear cuenta de prueba
                </button>
            </form>
        </div>
    )
}
