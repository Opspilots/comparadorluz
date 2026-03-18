
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'

import type { CustomerStatus, Commissioner } from '@/shared/types'

export function CustomerForm() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const location = useLocation()
    const customerData = location.state?.customerData
    const isEditing = !!id
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)


    // Form State
    const [cif, setCif] = useState('')
    const [name, setName] = useState('')
    const [customerType, setCustomerType] = useState<'empresa' | 'particular'>('empresa')
    const [status, setStatus] = useState<CustomerStatus>('prospecto')
    // ... other states

    // Multi-contact state (for new customer creation)
    // Contact State (Split for better UI)
    // For Particulars
    const [partEmail, setPartEmail] = useState('')
    const [partPhone, setPartPhone] = useState('')

    // For Companies (Multi-value)
    const [companyEmails, setCompanyEmails] = useState<{ id?: string, _key: string, value: string, label: string }[]>([{ _key: crypto.randomUUID(), value: '', label: 'Administración' }])
    const [companyPhones, setCompanyPhones] = useState<{ id?: string, _key: string, value: string, label: string }[]>([{ _key: crypto.randomUUID(), value: '', label: 'General' }])
    const [province, setProvince] = useState('')
    const [city, setCity] = useState('')
    const [address, setAddress] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [commissioners, setCommissioners] = useState<Pick<Commissioner, 'id' | 'full_name'>[]>([])

    const fetchCommissioners = useCallback(async () => {
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
    }, [])

    const fetchCustomer = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*, contacts(*)')
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

                // Populate Contacts
                if (data.contacts && data.contacts.length > 0) {
                    const contacts = data.contacts as { id: string; email: string; phone: string; position: string; first_name: string }[]
                    if (data.customer_type === 'particular') {
                        const emailContact = contacts.find((c) => c.email);
                        const phoneContact = contacts.find((c) => c.phone);
                        if (emailContact) setPartEmail(emailContact.email);
                        if (phoneContact) setPartPhone(phoneContact.phone);
                    } else {
                        // Company: Map to arrays
                        const emails: { id?: string, _key: string, value: string, label: string }[] = [];
                        const phones: { id?: string, _key: string, value: string, label: string }[] = [];

                        contacts.forEach((c) => {
                            if (c.email) emails.push({ id: c.id, _key: c.id, value: c.email, label: c.position || c.first_name || 'Email' });
                            if (c.phone) phones.push({ id: c.id, _key: c.id, value: c.phone, label: c.position || c.first_name || 'Teléfono' });
                        });

                        setCompanyEmails(emails.length > 0 ? emails : []);
                        setCompanyPhones(phones.length > 0 ? phones : []);
                    }
                }
            }
        } catch (err) {
            const error = err as Error;
            console.error('Error fetching customer:', error)
            setError('No se pudo cargar la información del cliente')
        }
    }, [id])

    useEffect(() => {
        const init = async () => {
            setPageLoading(true);
            await fetchCommissioners();
            if (isEditing) {
                await fetchCustomer();
            } else {
                // If creating new, we are done loading after commissioners
                if (customerData) {
                    // Auto-fill logic from OCR if present
                    if (customerData.name) setName(customerData.name);
                    if (customerData.cif) setCif(customerData.cif);
                    if (customerData.type) setCustomerType(customerData.type);
                    if (customerData.address) setAddress(customerData.address);
                    if (customerData.city) setCity(customerData.city);
                    if (customerData.province) setProvince(customerData.province);
                }
            }
            setPageLoading(false);
        };
        init();
    }, [isEditing, customerData, fetchCommissioners, fetchCustomer])

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
                .maybeSingle()

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

            let customerId = id;
            if (isEditing) {
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error;
            } else {
                // Check if CIF already exists before inserting
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('company_id', companyId)
                    .eq('cif', cif)
                    .maybeSingle()

                if (existingCustomer) {
                    throw new Error(`Ya existe un cliente con el CIF ${cif}: "${existingCustomer.name}". ¿Quizás quieres editarlo ? `)
                }

                const { data: newCust, error } = await supabase
                    .from('customers')
                    .insert(payload)
                    .select('id')
                    .single()

                if (error) throw error;
                customerId = newCust.id;
            }

            // HANDLE CONTACTS (Create or Update)
            if (customerType === 'particular') {
                // Particular: Upsert Primary (Search by customer_id + is_primary/position?)
                // For simplicity: Insert if new, or update if exists (would require logic to find ID).
                // If editing, we didn't store the ID for particular's contact. 
                // Let's just insert for now if it's new, otherwise we need to fetch ID?
                // IMPROVEMENT: If isEditing, we should update the existing contact.

                // Fetch existing primary contact to update it
                const { data: existingContacts } = await supabase.from('contacts').select('id').eq('customer_id', customerId).limit(1);

                if (partEmail || partPhone) {
                    const contactPayload = {
                        company_id: companyId,
                        customer_id: customerId,
                        first_name: name.split(' ')[0] || 'Cliente',
                        last_name: name.split(' ').slice(1).join(' ') || '',
                        email: partEmail || null,
                        phone: partPhone || null,
                        is_primary: true,
                        position: 'Titular'
                    };

                    if (existingContacts && existingContacts.length > 0) {
                        await supabase.from('contacts').update(contactPayload).eq('id', existingContacts[0].id);
                    } else {
                        await supabase.from('contacts').insert(contactPayload);
                    }
                }
            } else {
                // Companies: Emails
                for (const item of companyEmails) {
                    if (item.value.trim()) {
                        const payload = {
                            company_id: companyId,
                            customer_id: customerId,
                            first_name: item.label || 'Email',
                            last_name: '',
                            email: item.value,
                            position: item.label,
                            is_primary: false
                        };

                        if (item.id) {
                            await supabase.from('contacts').update(payload).eq('id', item.id);
                        } else {
                            await supabase.from('contacts').insert(payload);
                        }
                    } else if (item.id) {
                        // Value cleared? Delete it? Or ignore?
                        // Let's delete if value is empty and it had an ID
                        // await supabase.from('contacts').delete().eq('id', item.id);
                    }
                }
                // Companies: Phones
                for (const item of companyPhones) {
                    if (item.value.trim()) {
                        const payload = {
                            company_id: companyId,
                            customer_id: customerId,
                            first_name: item.label || 'Teléfono',
                            last_name: '',
                            phone: item.value,
                            position: item.label,
                            is_primary: false
                        };

                        if (item.id) {
                            await supabase.from('contacts').update(payload).eq('id', item.id);
                        } else {
                            await supabase.from('contacts').insert(payload);
                        }
                    }
                }
            }
            // End Contact Handling

            navigate(isEditing ? `/crm/${id}` : `/crm/${customerId}`)
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
        <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>


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
                    <div className="tour-customer-form-cif">
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
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
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
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="tour-customer-form-status">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estado del Lead</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
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
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
                        >
                            <option value="">Sin asignar</option>
                            {commissioners.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Contact Methods Section */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>


                    {customerType === 'particular' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Personal</label>
                                <input
                                    type="email"
                                    value={partEmail}
                                    onChange={(e) => setPartEmail(e.target.value)}
                                    placeholder="ejemplo@gmail.com"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Teléfono Móvil</label>
                                <input
                                    type="tel"
                                    value={partPhone}
                                    onChange={(e) => setPartPhone(e.target.value)}
                                    placeholder="600 000 000"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Company Emails */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>Correos Electrónicos</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {companyEmails.map((item, index) => (
                                        <div key={item._key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                type="email"
                                                placeholder="ejemplo@empresa.com"
                                                value={item.value}
                                                onChange={(e) => {
                                                    setCompanyEmails(prev => prev.map((item, i) =>
                                                        i === index ? { ...item, value: e.target.value } : item
                                                    ));
                                                }}
                                                style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Etiqueta (Ej: Admin)"
                                                value={item.label}
                                                onChange={(e) => {
                                                    setCompanyEmails(prev => prev.map((item, i) =>
                                                        i === index ? { ...item, label: e.target.value } : item
                                                    ));
                                                }}
                                                style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                                            />
                                            {companyEmails.length > 1 && (
                                                <button type="button" onClick={() => setCompanyEmails(companyEmails.filter((_, i) => i !== index))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setCompanyEmails([...companyEmails, { _key: crypto.randomUUID(), value: '', label: '' }])} style={{ fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>+ Añadir otro email</button>
                                </div>
                            </div>

                            {/* Company Phones */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>Teléfonos</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {companyPhones.map((item, index) => (
                                        <div key={item._key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                type="tel"
                                                placeholder="+34 91 000 000"
                                                value={item.value}
                                                onChange={(e) => {
                                                    setCompanyPhones(prev => prev.map((item, i) =>
                                                        i === index ? { ...item, value: e.target.value } : item
                                                    ));
                                                }}
                                                style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Etiqueta (Ej: Oficina)"
                                                value={item.label}
                                                onChange={(e) => {
                                                    setCompanyPhones(prev => prev.map((item, i) =>
                                                        i === index ? { ...item, label: e.target.value } : item
                                                    ));
                                                }}
                                                style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                                            />
                                            {companyPhones.length > 1 && (
                                                <button type="button" onClick={() => setCompanyPhones(companyPhones.filter((_, i) => i !== index))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setCompanyPhones([...companyPhones, { _key: crypto.randomUUID(), value: '', label: '' }])} style={{ fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>+ Añadir otro teléfono</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Dirección de Suministro / Fiscal</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, número, piso..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '100px' }}
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
