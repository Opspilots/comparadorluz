import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Customer, Contact, SupplyPoint, Contract } from '@/shared/types'

export function CustomerDetails() {
    const { id } = useParams<{ id: string }>()
    const [loading, setLoading] = useState(true)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [supplyPoints, setSupplyPoints] = useState<SupplyPoint[]>([])
    const [contracts, setContracts] = useState<Contract[]>([])

    useEffect(() => {
        if (id) fetchCustomerData(id)
    }, [id])

    const fetchCustomerData = async (customerId: string) => {
        setLoading(true)

        // 1. Fetch Customer
        const { data: cust, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

        // 2. Fetch Contacts
        const { data: cont, error: contErr } = await supabase
            .from('contacts')
            .select('*')
            .eq('customer_id', customerId)

        // 3. Fetch Supply Points
        const { data: sps, error: spErr } = await supabase
            .from('supply_points')
            .select('*')
            .eq('customer_id', customerId)

        // 4. Fetch Contracts
        const { data: contr, error: contrErr } = await supabase
            .from('contracts')
            .select(`
                *,
                tariff_versions (
                    tariff_name,
                    suppliers (name)
                )
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        if (!custErr) setCustomer(cust)
        if (!contErr) setContacts(cont || [])
        if (!spErr) setSupplyPoints(sps || [])
        if (!contrErr) setContracts(contr || [])

        setLoading(false)
    }

    // Badge Style Helper
    const badgeStyle = (status: string) => {
        const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, border: '1px solid transparent', display: 'inline-block' }
        switch (status) {
            case 'active': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
            case 'signed': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
            case 'pending': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
            case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
            case 'cliente': return { ...base, background: '#dcfce7', color: '#10b981', borderColor: '#bbf7d0' }
            case 'perdido': return { ...base, background: '#fee2e2', color: '#ef4444', borderColor: '#fecaca' }
            case 'propuesta': return { ...base, background: '#e0f2fe', color: '#0ea5e9', borderColor: '#bae6fd' }
            case 'negociacion': return { ...base, background: '#fef3c7', color: '#f59e0b', borderColor: '#fde68a' }
            case 'contactado': return { ...base, background: '#f3e8ff', color: '#8b5cf6', borderColor: '#e9d5ff' }
            default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
        }
    }

    const statusLabels: Record<string, string> = {
        'prospecto': 'Prospecto',
        'contactado': 'Contactado',
        'propuesta': 'Propuesta',
        'negociacion': 'Negociación',
        'cliente': 'Cliente',
        'perdido': 'Perdido'
    }

    const handleStatusChange = async (newStatus: string) => {
        if (!id || !customer) return
        try {
            const { error } = await supabase
                .from('customers')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error
            setCustomer({ ...customer, status: newStatus as any })
        } catch (err) {
            console.error('Error updating status:', err)
            alert('No se pudo actualizar el estado')
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Cargando ficha del cliente...</div>
    if (!customer) return <div style={{ padding: '2rem' }}>Cliente no encontrado.</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <Link to="/crm" style={{ color: '#666', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>← Volver al listado</Link>
                    <h1 style={{ margin: 0 }}>{customer.name}</h1>
                    <p style={{ color: '#666', margin: '0.5rem 0' }}>CIF: {customer.cif} | {customer.province || 'Sin provincia'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to={`/crm/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Editar Datos</Link>
                    <select
                        value={customer.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        style={{
                            ...badgeStyle(customer.status),
                            appearance: 'none',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {Object.entries(statusLabels).map(([val, label]) => (
                            <option key={val} value={val} style={{ background: 'white', color: 'black' }}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div style={{ display: 'grid', gap: '2rem' }}>

                    {/* Section: Contracts */}
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Contratos</h2>
                            <Link to="/contracts/new" state={{ prefillData: { customerId: customer.id } }} className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>+ Nuevo Contrato</Link>
                        </div>
                        {contracts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No hay contratos asociados a este cliente.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {contracts.map(contract => (
                                    <div key={contract.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{contract.contract_number}</span>
                                                <span style={badgeStyle(contract.status)}>{contract.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                {(contract.tariff_versions as unknown as { suppliers?: { name: string } })?.suppliers?.name || 'Comercializadora desconocida'} - {contract.tariff_versions?.tariff_name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                Firmado el: {contract.signed_at || 'Pendiente'} | Valor: {contract.annual_value_eur?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </div>
                                        </div>
                                        <div>
                                            <Link to={`/contracts/${contract.id}/view`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', textDecoration: 'none' }}>Ver Contrato</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Section: Supply Points */}
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Puntos de Suministro (CUPS)</h2>
                            <Link to={`/crm/${customer.id}/supply-points/new`} className="btn btn-secondary" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>+ Añadir CUPS</Link>
                        </div>
                        {supplyPoints.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No hay puntos de suministro registrados.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {supplyPoints.map(sp => (
                                    <div key={sp.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
                                        <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>{sp.cups || 'Sin CUPS'}</p>
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{sp.address}</p>
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                            <span><strong>Potencia:</strong> {sp.contracted_power_kw || '?'} kW</span>
                                            <span><strong>Consumo:</strong> {sp.annual_consumption_kwh || '?'} kWh</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {/* Sidebar */}
                <aside style={{ display: 'grid', gap: '2rem', alignContent: 'start' }}>
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Contactos</h3>
                            <Link to={`/crm/${customer.id}/contacts/new`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', textDecoration: 'none' }}>+ Nuevo</Link>
                        </div>
                        {contacts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin contactos.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {contacts.map(c => (
                                    <div key={c.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                        <p style={{ fontWeight: 600, margin: 0, fontSize: '0.95rem' }}>{c.first_name} {c.last_name}</p>
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{c.email}</p>
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{c.phone}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    )
}
