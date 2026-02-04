import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Customer, Contact, SupplyPoint } from '@/shared/types'

export function CustomerDetails() {
    const { id } = useParams<{ id: string }>()
    const [loading, setLoading] = useState(true)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [supplyPoints, setSupplyPoints] = useState<SupplyPoint[]>([])

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

        if (!custErr) setCustomer(cust)
        if (!contErr) setContacts(cont || [])
        if (!spErr) setSupplyPoints(sps || [])

        setLoading(false)
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
                <div style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '4px', textTransform: 'capitalize' }}>
                    {customer.status}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div style={{ display: 'grid', gap: '2rem' }}>
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

                    {/* Section: History/Activities placeholder */}
                    <section className="card">
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Historial de Actividad</h2>
                        <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registro de llamadas, correos y visitas (Próximamente).</p>
                        </div>
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

                    <section className="card">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Últimas Comparativas</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Accede a las propuestas generadas (Próximamente).</p>
                    </section>
                </aside>
            </div>
        </div>
    )
}
