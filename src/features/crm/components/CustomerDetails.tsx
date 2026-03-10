import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { Mail, Phone, MessageSquare, BarChart3, Download, Loader2, Database } from 'lucide-react';
import { SipsImportDialog } from './SipsImportDialog'
import type { Customer, Contact, SupplyPoint, Contract, Integration } from '@/shared/types'
import { useState, useEffect } from 'react'
import { useConsumptionData, useFetchDatadisConsumption, useMyIntegrations } from '@/features/integrations/lib/useIntegrations'
import { ConsumptionChart } from '@/features/integrations/components/ConsumptionChart'

function SupplyPointWithConsumption({ sp, companyId, datadisIntegration, onRefresh }: {
    sp: SupplyPoint
    companyId: string
    datadisIntegration: Integration | undefined
    onRefresh: () => void
}) {
    const [showConsumption, setShowConsumption] = useState(false)
    const [showSips, setShowSips] = useState(false)
    const { data: consumption, isLoading: loadingConsumption } = useConsumptionData(
        companyId,
        showConsumption ? sp.cups : undefined
    )
    const fetchConsumption = useFetchDatadisConsumption(companyId)

    const handleImport = async () => {
        if (!datadisIntegration || !sp.cups) return
        await fetchConsumption.mutateAsync({
            integrationId: datadisIntegration.id,
            cups: sp.cups,
        })
        setShowConsumption(true)
    }

    const hasConsumption = consumption && consumption.length > 0

    return (
        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
            <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: 'monospace', fontSize: '1.1rem' }}>{sp.cups || 'Sin CUPS'}</p>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{sp.address}</p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span><strong>Potencia:</strong> {sp.contracted_power_kw || '?'} kW</span>
                <span><strong>Consumo:</strong> {sp.annual_consumption_kwh || '?'} kWh</span>
                {sp.cups && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        {datadisIntegration?.status === 'active' && (
                            <button
                                onClick={handleImport}
                                disabled={fetchConsumption.isPending}
                                style={{
                                    padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                                    background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff',
                                    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                }}
                            >
                                {fetchConsumption.isPending
                                    ? <><Loader2 size={11} className="animate-spin" /> Importando...</>
                                    : <><Download size={11} /> Importar Datadis</>
                                }
                            </button>
                        )}
                        <button
                            onClick={() => setShowSips(true)}
                            style={{
                                padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                                background: sp.sips_imported_at ? '#dcfce7' : '#eff6ff',
                                color: sp.sips_imported_at ? '#15803d' : '#2563eb',
                                border: '1px solid',
                                borderColor: sp.sips_imported_at ? '#bbf7d0' : '#bfdbfe',
                                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                            }}
                        >
                            <Database size={11} />
                            {sp.sips_imported_at ? 'SIPS' : 'Importar SIPS'}
                        </button>
                        <button
                            onClick={() => setShowConsumption(!showConsumption)}
                            style={{
                                padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                                background: showConsumption ? '#dbeafe' : '#f1f5f9', color: showConsumption ? '#1d4ed8' : '#475569',
                                border: '1px solid', borderColor: showConsumption ? '#bfdbfe' : '#e2e8f0',
                                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                            }}
                        >
                            <BarChart3 size={11} />
                            {showConsumption ? 'Ocultar consumos' : 'Ver consumos'}
                        </button>
                    </div>
                )}
            </div>

            {/* Consumption chart */}
            {showConsumption && sp.cups && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    {loadingConsumption ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Loader2 size={16} className="animate-spin inline-block mr-1" /> Cargando consumos...
                        </div>
                    ) : hasConsumption ? (
                        <ConsumptionChart data={consumption} cups={sp.cups} />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No hay datos de consumo.
                            {datadisIntegration?.status === 'active' && ' Pulsa "Importar Datadis" para obtener datos reales.'}
                        </div>
                    )}
                </div>
            )}

            {/* Import success message */}
            {fetchConsumption.isSuccess && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>
                    Consumos importados correctamente
                </p>
            )}

            {/* SIPS data summary */}
            {sp.sips_imported_at && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        <Database size={12} color="#2563eb" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>Datos SIPS</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            Importado: {new Date(sp.sips_imported_at).toLocaleDateString('es-ES')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {sp.contracted_power_p1_kw && <span><strong>P1:</strong> {sp.contracted_power_p1_kw} kW</span>}
                        {sp.contracted_power_p2_kw && <span><strong>P2:</strong> {sp.contracted_power_p2_kw} kW</span>}
                        {sp.contracted_power_p3_kw && <span><strong>P3:</strong> {sp.contracted_power_p3_kw} kW</span>}
                        {sp.contracted_power_p4_kw && <span><strong>P4:</strong> {sp.contracted_power_p4_kw} kW</span>}
                        {sp.contracted_power_p5_kw && <span><strong>P5:</strong> {sp.contracted_power_p5_kw} kW</span>}
                        {sp.contracted_power_p6_kw && <span><strong>P6:</strong> {sp.contracted_power_p6_kw} kW</span>}
                        {sp.meter_type && <span><strong>Contador:</strong> {sp.meter_type}</span>}
                        {sp.voltage_level && <span><strong>Tensión:</strong> {sp.voltage_level}</span>}
                    </div>
                </div>
            )}

            {/* SIPS Import Dialog */}
            {showSips && sp.cups && (
                <SipsImportDialog
                    supplyPointId={sp.id}
                    cups={sp.cups}
                    onClose={() => setShowSips(false)}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    )
}

export function CustomerDetails() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [supplyPoints, setSupplyPoints] = useState<SupplyPoint[]>([])
    const [contracts, setContracts] = useState<Contract[]>([])
    const [companyId, setCompanyId] = useState<string | null>(null)

    // Fetch company_id for integration lookups
    useEffect(() => {
        supabase.rpc('get_auth_company_id').then(({ data }) => {
            if (data) setCompanyId(data as string)
        })
    }, [])

    const { data: integrations } = useMyIntegrations(companyId || '')
    const datadisIntegration = integrations?.find(
        (i) => {
            const provider = (i as unknown as Record<string, unknown>).integration_providers as { slug?: string } | undefined
            return provider?.slug === 'datadis' && i.status === 'active'
        }
    )

    useEffect(() => {
        if (id) fetchCustomerData(id)
    }, [id])


    const fetchCustomerData = async (customerId: string) => {
        setLoading(true)

        const { data: cust, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

        const { data: cont, error: contErr } = await supabase
            .from('contacts')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true })

        const { data: sps, error: spErr } = await supabase
            .from('supply_points')
            .select('*')
            .eq('customer_id', customerId)

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

    const badgeStyle = (status: string) => {
        const base: React.CSSProperties = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', border: '1px solid transparent', display: 'inline-block' }
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

    if (loading) return <div style={{ padding: '2rem' }}>Cargando ficha del cliente...</div>
    if (!customer) return <div style={{ padding: '2rem' }}>Cliente no encontrado.</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <Link to="/crm" style={{ color: '#666', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>← Volver al listado</Link>
                    <div style={{ margin: 0 }}>{customer.name}</div>
                    <p style={{ color: '#666', margin: '0.5rem 0' }}>CIF: {customer.cif} | {customer.province || 'Sin provincia'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link
                        to={`/admin/messages/${id}`}
                        className="btn btn-primary"
                        style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                    >
                        Enviar Mensaje
                    </Link>
                    <span style={badgeStyle(customer.status)}>
                        {statusLabels[customer.status] || customer.status}
                    </span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Main Content */}
                <div style={{ display: 'grid', gap: '2rem' }}>

                    {/* Section: Contracts */}
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>

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

                        </div>
                        {supplyPoints.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No hay puntos de suministro registrados.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {supplyPoints.map(sp => (
                                    <SupplyPointWithConsumption
                                        key={sp.id}
                                        sp={sp}
                                        companyId={companyId || ''}
                                        datadisIntegration={datadisIntegration}
                                        onRefresh={() => id && fetchCustomerData(id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {/* Sidebar */}
                <aside style={{ display: 'grid', gap: '2rem', alignContent: 'start' }}>
                    {/* Contacts Section */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>

                        </div>

                        {/* Emails Section */}
                        <div style={{ marginBottom: '1.5rem' }}>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {contacts.filter(c => c.email).map(contact => (
                                    <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #f3f4f6', transition: 'border-color 0.15s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            <div style={{ background: '#dbeafe', padding: '0.5rem', borderRadius: '9999px' }}>
                                                <Mail size={16} style={{ color: '#2563eb' }} />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {customer.customer_type === 'empresa' && (contact.position || contact.first_name || 'Email')}
                                                    {contact.is_primary && <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.375rem', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', borderRadius: '0.25rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Principal</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => navigate(`/admin/messages/${customer.id}?contactId=${contact.id}`)}
                                                title="Enviar mensaje"
                                                style={{ padding: '0.375rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#4b5563', borderRadius: '0.25rem' }}
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Phones Section */}
                        <div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {contacts.filter(c => c.phone).map(contact => (
                                    <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #f3f4f6', transition: 'border-color 0.15s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            <div style={{ background: '#dcfce7', padding: '0.5rem', borderRadius: '9999px' }}>
                                                <Phone size={16} style={{ color: '#16a34a' }} />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.phone}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {customer.customer_type === 'empresa' && (contact.position || contact.first_name || 'Teléfono')}
                                                    {contact.is_primary && <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.375rem', background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', borderRadius: '0.25rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Principal</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <a href={`tel:${contact.phone}`} title="Llamar" style={{ padding: '0.5rem', color: '#4b5563', borderRadius: '0.375rem', textDecoration: 'none', transition: 'color 0.15s' }}>
                                                <Phone size={16} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}
