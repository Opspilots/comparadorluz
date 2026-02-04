import React, { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate } from 'react-router-dom'
import type { CustomerStatus } from '@/shared/types'

export function CustomerForm() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [cif, setCif] = useState('')
    const [name, setName] = useState('')
    const [customerType, setCustomerType] = useState<'empresa' | 'particular'>('empresa')
    const [status, setStatus] = useState<CustomerStatus>('prospecto')
    const [province, setProvince] = useState('')
    const [city, setCity] = useState('')
    const [address, setAddress] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            // Fetch the user's profile to get the correct company_id
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Profile Fetch Error:', profileError)
                throw new Error(`Error perfil: ${profileError.message} (${profileError.code})`)
            }
            const companyId = profile.company_id

            const { error: insertError } = await supabase
                .from('customers')
                .insert({
                    company_id: companyId,
                    cif,
                    name,
                    customer_type: customerType,
                    status,
                    province,
                    city,
                    address,
                    assigned_to: user.id
                })

            if (insertError) throw insertError

            navigate('/crm')
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al crear cliente')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nuevo Cliente</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Registra un nuevo prospecto o cliente en tu base de datos.</p>

            {error && (
                <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tipo de Cliente</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setCustomerType('empresa')}
                                className={customerType === 'empresa' ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Empresa (CIF)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerType('particular')}
                                className={customerType === 'particular' ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Particular (NIF)
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{customerType === 'empresa' ? 'CIF' : 'NIF'}</label>
                        <input
                            type="text"
                            required
                            value={cif}
                            onChange={(e) => setCif(e.target.value.toUpperCase())}
                            placeholder={customerType === 'empresa' ? 'Ej: B12345678' : 'Ej: 12345678A'}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{customerType === 'empresa' ? 'Razón Social / Nombre Comercial' : 'Nombre Completo'}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={customerType === 'empresa' ? 'Ej: Energy S.L.' : 'Ej: Juan Pérez'}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estado del Lead</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="prospecto">Prospecto (Lead)</option>
                            <option value="contactado">Contactado</option>
                            <option value="calificado">Calificado</option>
                            <option value="propuesta">Propuesta Enviada</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Provincia</label>
                            <input
                                type="text"
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Ciudad</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Dirección de Suministro / Fiscal</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, número, piso..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: '100px' }}
                    />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.875rem', fontSize: '1rem' }}
                    >
                        {loading ? 'Guardando...' : 'Crear Cliente'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/crm')}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.875rem', fontSize: '1rem' }}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
