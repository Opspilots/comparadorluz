import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export function ContactForm() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [position, setPosition] = useState('')
    const [isPrimary, setIsPrimary] = useState(false)

    // Verify customer exists and get company context if needed (optional but good for UX)
    useEffect(() => {
        if (!customerId) navigate('/crm')
    }, [customerId, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null) // Keep this to clear previous errors, even if toast is used for new ones

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            // Fetch correct company_id
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (profileError || !profile) throw new Error('Error al verificar permisos de empresa.')
            const companyId = profile.company_id

            // Verify customer belongs to this company before inserting contact
            const { data: customerCheck } = await supabase
                .from('customers')
                .select('id')
                .eq('id', customerId)
                .eq('company_id', companyId)
                .maybeSingle()
            if (!customerCheck) throw new Error('Cliente no encontrado o sin permisos')

            const { error: insertError } = await supabase
                .from('contacts')
                .insert({
                    company_id: companyId,
                    customer_id: customerId,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    position: position,
                    is_primary: isPrimary
                })

            if (insertError) throw insertError

            navigate(`/crm/${customerId}`)
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al guardar contacto', variant: 'destructive' })
            // Optionally, you could still set the error state here if you want it to display in the form's error div as well
            // setError(err instanceof Error ? err.message : 'Error al guardar contacto');
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>


            {error && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', marginBottom: '1.5rem', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Nombre</label>
                        <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Apellidos</label>
                        <input
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Teléfono</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Cargo / Puesto</label>
                    <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Ej: Director Gerente"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="isPrimary"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem' }}
                    />
                    <label htmlFor="isPrimary" style={{ cursor: 'pointer' }}>Es el contacto principal</label>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.8rem' }}
                    >
                        {loading ? 'Guardando...' : 'Guardar Contacto'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/crm/${customerId}`)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.8rem' }}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
