import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { CustomerStatus, Commissioner } from '@/shared/types'

export function CustomerForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const location = useLocation()
    const isEditing = !!id
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(isEditing)
    const [error, setError] = useState<string | null>(null)

    // Get customer data from navigation state if coming from OCR
    const customerData = (location.state as any)?.customerData

    // Form State
    const [cif, setCif] = useState('')
    const [name, setName] = useState('')
    const [customerType, setCustomerType] = useState<'empresa' | 'particular'>('empresa')
    const [status, setStatus] = useState<CustomerStatus>('prospecto')
    const [province, setProvince] = useState('')
    const [city, setCity] = useState('')
    const [address, setAddress] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [commissioners, setCommissioners] = useState<Pick<Commissioner, 'id' | 'full_name'>[]>([])

    useEffect(() => {
        fetchCommissioners()
        if (isEditing) {
            fetchCustomer()
        } else if (customerData) {
            // Auto-fill from OCR
            if (customerData.name) setName(customerData.name);
            if (customerData.cif) setCif(customerData.cif);
            if (customerData.type) setCustomerType(customerData.type);
            if (customerData.address) setAddress(customerData.address);
            if (customerData.city) setCity(customerData.city);
            if (customerData.province) setProvince(customerData.province);
        }
    }, [id, customerData])

    async function fetchCommissioners() {
        try {
            const { data, error } = await supabase
                .from('commissioners')
                .select('id, full_name')
                .eq('is_active', true)
                .order('full_name')

            if (error) throw error
            setCommissioners(data || [])
        } catch (err) {
            console.error('Error fetching commissioners:', err)
        }
    }

    async function fetchCustomer() {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (data) {
                setCif(data.cif)
                setName(data.name)
                setCustomerType(data.customer_type)
                setStatus(data.status)
                setProvince(data.province || '')
                setCity(data.city || '')
                setAddress(data.address || '')
                setAssignedTo(data.assigned_to || '')
            }
        } catch (err) {
            const error = err as Error;
            console.error('Error fetching customer:', error)
            setError('No se pudo cargar la información del cliente')
        } finally {
            setPageLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validate CIF/NIF format
        const isValidFormat =
            /^[0-9]{8}[A-Z]$/.test(cif) ||
            /^[XYZ][0-9]{7}[A-Z]$/.test(cif) ||
            /^[A-Z][0-9]{7}[0-9A-Z]$/.test(cif);

        if (!isValidFormat) {
            setError('El NIF/CIF no tiene un formato válido (Ej: 12345678A, B12345678)');
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile) throw new Error('Perfil no encontrado')
            const companyId = profile.company_id

            const payload = {
                company_id: companyId,
                cif,
                name,
                customer_type: customerType,
                status,
                province,
                city,
                address,
                assigned_to: assignedTo || null
            }

            let resultError = null
            if (isEditing) {
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', id)
                resultError = error
            } else {
                // Check if CIF already exists before inserting
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('company_id', companyId)
                    .eq('cif', cif)
                    .maybeSingle()

                if (existingCustomer) {
                    throw new Error(`Ya existe un cliente con el CIF ${cif}: "${existingCustomer.name}". ¿Quizás quieres editarlo?`)
                }

                const { error } = await supabase
                    .from('customers')
                    .insert(payload)
                resultError = error
            }

            if (resultError) throw resultError

            navigate(isEditing ? `/crm/${id}` : '/crm')
        } catch (err) {
            const error = err as Error;
            console.error(error)
            setError(error.message || 'Error al guardar cliente')
        } finally {
            setLoading(false)
        }
    }

    if (pageLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando cliente...</div>

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{isEditing ? 'Actualiza la información del cliente y gestiona su estado.' : 'Registra un nuevo prospecto o cliente en tu base de datos.'}</p>

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
                            onChange={(e) => {
                                const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                                setCif(clean);
                            }}
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
                            <option value="propuesta">Propuesta Enviada</option>
                            <option value="negociacion">Negociación</option>
                            <option value="cliente">Cliente (Activo)</option>
                            <option value="perdido">Perdido / Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Asignar a Comisionado</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="">Sin asignar</option>
                            {commissioners.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                        {loading ? 'Guardando...' : (isEditing ? 'Actualizar Cliente' : 'Crear Cliente')}
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
