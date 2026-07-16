import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/shared/lib/errors'
import { Input } from '@/shared/components/ui/input'

export function ContactForm() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
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
            const msg = getErrorMessage(err)
            toast({ title: 'Error', description: msg, variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label htmlFor="firstName" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Nombre</label>
                        <Input
                            id="firstName"
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="lastName" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Apellidos</label>
                        <Input
                            id="lastName"
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Teléfono</label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="position" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Cargo / Puesto</label>
                    <Input
                        id="position"
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Ej: Director Gerente"
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
