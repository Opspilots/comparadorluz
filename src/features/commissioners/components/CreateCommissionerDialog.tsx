
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { X, Mail, User, Check } from 'lucide-react'

interface CreateCommissionerDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateCommissionerDialog({ isOpen, onClose, onSuccess }: CreateCommissionerDialogProps) {
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setEmail('')
            setFullName('')
            setError(null)
            setSuccess(false)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Check if commissioner already exists by email
            const { data: existing } = await supabase
                .from('commissioners')
                .select('id')
                .eq('email', email)
                .single()

            if (existing) {
                setError('Ya existe un comisionado con este correo electrónico.')
                setLoading(false)
                return
            }

            // 2. Get company_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!userData?.company_id) throw new Error('Error al obtener info de empresa')

            // 3. Insert new commissioner
            const { error: createError } = await supabase
                .from('commissioners')
                .insert({
                    company_id: userData.company_id,
                    full_name: fullName,
                    email: email,
                    is_active: true,
                    commission_default_pct: 0
                })

            if (createError) throw createError

            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 2000)

        } catch (err: any) {
            console.error('Error creating commissioner:', err)
            setError(err.message || 'Error al crear comisionado')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="card" style={{ width: '450px', maxWidth: '90%', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h3 className="text-lg font-semibold">Nuevo Comisionado</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#166534', margin: '0 auto 1.5rem'
                        }}>
                            <Check size={32} />
                        </div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>¡Comisionado Creado!</h4>
                        <p style={{ color: '#64748b' }}>
                            Se ha añadido a <strong>{fullName}</strong> correctamente al equipo.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', color: '#991b1b', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                Nombre Completo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    style={{ width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                Correo Electrónico
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="ejemplo@empresa.com"
                                    style={{ width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                />
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem', color: '#64748b' }}>
                            <p style={{ marginBottom: '0.5rem' }}>
                                <strong>Nota:</strong> Este comisionado será creado como entidad independiente.
                            </p>
                            <p>
                                Podrás configurar sus reglas de comisión inmediatamente.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ minWidth: '120px' }}
                            >
                                {loading ? 'Creando...' : 'Crear Comisionado'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
