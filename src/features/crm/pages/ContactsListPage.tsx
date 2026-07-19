import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Mail, Phone, Trash2, ArrowLeft, Star } from 'lucide-react'
import type { Contact, Customer } from '@/shared/types'

async function fetchContactsData(customerId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
    if (!profile?.company_id) throw new Error('Perfil no encontrado')
    const cid = profile.company_id

    const [custRes, contRes] = await Promise.all([
        supabase.from('customers').select('id, name, cif').eq('id', customerId).eq('company_id', cid).single(),
        supabase.from('contacts').select('*').eq('customer_id', customerId).eq('company_id', cid).order('is_primary', { ascending: false }).order('created_at', { ascending: true }),
    ])

    if (custRes.error) throw custRes.error
    if (contRes.error) throw contRes.error

    return {
        customer: custRes.data as Customer,
        contacts: (contRes.data || []) as Contact[],
        companyId: cid,
    }
}

export function ContactsListPage() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data, isLoading, error } = useQuery({
        queryKey: ['contacts-list', customerId],
        queryFn: () => fetchContactsData(customerId!),
        enabled: !!customerId,
    })

    const deleteMutation = useMutation({
        mutationFn: async (contactId: string) => {
            const { error } = await supabase.from('contacts').delete().eq('id', contactId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts-list', customerId] })
            queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] })
            toast({ title: 'Contacto eliminado' })
        },
        onError: (err) => {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al eliminar', variant: 'destructive' })
        },
    })

    if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando contactos...</div>
    if (error || !data) return <div style={{ padding: '2rem', color: '#dc2626' }}>Error al cargar los contactos.</div>

    const { customer, contacts } = data

    const handleDelete = (contact: Contact) => {
        if (!confirm(`¿Eliminar el contacto ${contact.first_name} ${contact.last_name}?`)) return
        deleteMutation.mutate(contact.id)
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <Link
                    to={`/crm/${customerId}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '0.75rem' }}
                >
                    <ArrowLeft size={14} /> Volver a {customer.name}
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Contactos</h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {customer.name} · {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/crm/${customerId}/contacts/new`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Plus size={15} /> Añadir Contacto
                    </button>
                </div>
            </div>

            {/* Table */}
            {contacts.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '1rem' }}>No hay contactos registrados para este cliente.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/crm/${customerId}/contacts/new`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Plus size={15} /> Añadir primer contacto
                    </button>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                                {['Nombre', 'Email', 'Teléfono', 'Cargo', 'Principal', 'Acciones'].map((h) => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact, idx) => (
                                <tr
                                    key={contact.id}
                                    style={{
                                        borderBottom: idx < contacts.length - 1 ? '1px solid var(--border-light)' : 'none',
                                    }}
                                    // Background hover handled by the global `tbody tr:hover` rule
                                    // in index.css (already matches var(--color-background)) — no
                                    // need to mutate inline style on mouse events.
                                >
                                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500, fontSize: '0.875rem' }}>
                                        {contact.first_name} {contact.last_name}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {contact.email ? (
                                            <a href={`mailto:${contact.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#2563eb', textDecoration: 'none' }}>
                                                <Mail size={13} /> {contact.email}
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {contact.phone ? (
                                            <a href={`tel:${contact.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'inherit', textDecoration: 'none' }}>
                                                <Phone size={13} /> {contact.phone}
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {contact.position || '—'}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        {contact.is_primary && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid #bfdbfe' }}>
                                                <Star size={10} fill="currentColor" /> Principal
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <button
                                            onClick={() => handleDelete(contact)}
                                            disabled={deleteMutation.isPending}
                                            title="Eliminar contacto"
                                            style={{ padding: '0.375rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
