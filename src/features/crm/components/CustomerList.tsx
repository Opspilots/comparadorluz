import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Customer } from '@/shared/types'
import { Link } from 'react-router-dom'
import { LayoutGrid, List as ListIcon, Plus, Search, MapPin, Building2, User, Pencil, Trash2, Eye, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { removeEmojis } from '@/shared/lib/utils'

const PAGE_SIZE = 50

const badgeStyle = (status: string) => {
    const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, border: '1px solid transparent', letterSpacing: '0.025em' }
    switch (status) {
        case 'cliente': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
        case 'propuesta': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
        case 'negociacion': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
        case 'perdido': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
        case 'contactado': return { ...base, background: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' }
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

export function CustomerList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: customers = [], isLoading: loading } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (!profile?.company_id) throw new Error('No company_id found')

            const { data, error } = await supabase
                .from('customers')
                .select('id, name, cif, status, city, province, customer_type, created_at')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE)

            if (error) throw error
            return (data || []) as Customer[]
        },
    })

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cif.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleDelete = async () => {
        if (!deleteTarget) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
        if (!profile?.company_id) return
        const { error } = await supabase.from('customers').delete().eq('id', deleteTarget.id).eq('company_id', profile.company_id)
        if (error) {
            console.error('Error deleting customer:', error)
            toast({ title: 'Error', description: 'No se pudo eliminar al cliente.', variant: 'destructive' })
        } else {
            toast({ title: 'Cliente eliminado', description: `"${deleteTarget.name}" ha sido eliminado correctamente.` })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        }
        setDeleteTarget(null)
    }

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div></div>
            <div className="mobile-actions-wrap" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="tour-crm-search mobile-search-full" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o NIF/CIF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'white' }}
                    />
                </div>

                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '6px' }}>
                    <button
                        onClick={() => setViewMode('list')}
                        aria-label="Vista lista"
                        style={{
                            padding: '0.4rem',
                            border: 'none',
                            background: viewMode === 'list' ? 'white' : 'transparent',
                            borderRadius: '4px',
                            boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Vista Lista"
                    >
                        <ListIcon size={18} color={viewMode === 'list' ? 'black' : '#64748b'} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        aria-label="Vista cuadrícula"
                        style={{
                            padding: '0.4rem',
                            border: 'none',
                            background: viewMode === 'grid' ? 'white' : 'transparent',
                            borderRadius: '4px',
                            boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Vista Cuadrícula"
                    >
                        <LayoutGrid size={18} color={viewMode === 'grid' ? 'black' : '#64748b'} />
                    </button>
                </div>

                <Link to="/crm/new" className="btn btn-primary tour-crm-new-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
                    <Plus size={18} /> Nuevo Cliente
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando clientes...</p>
                </div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="card tour-crm-list" style={{ padding: 0, overflow: 'hidden' }}>
                          <div className="responsive-table-wrap">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: 'var(--border-light)', borderBottom: '1px solid var(--color-border)' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>IDENTIFICADOR</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>NOMBRE / RAZÓN SOCIAL</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>ESTADO</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>UBICACIÓN</th>
                                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No se encontraron clientes que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map(customer => (
                                            <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <code style={{ background: 'var(--color-background)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{customer.cif}</code>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{removeEmojis(customer.name)}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.customer_type === 'particular' ? 'Particular' : 'Empresa'}</div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <span style={badgeStyle(customer.status)}>
                                                        {statusLabels[customer.status] || customer.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{customer.city ? `${customer.city}, ${customer.province}` : customer.province || '-'}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <Link
                                                            to={`/crm/${customer.id}`}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}
                                                            title="Ver Detalle"
                                                            aria-label="Ver detalle del cliente"
                                                        >
                                                            <Eye size={14} />
                                                        </Link>
                                                        <Link
                                                            to={`/crm/${customer.id}/edit`}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Editar"
                                                            aria-label="Editar cliente"
                                                        >
                                                            <Pencil size={14} />
                                                        </Link>
                                                        <button
                                                            onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Eliminar"
                                                            aria-label="Eliminar cliente"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                          </div>
                        </div>
                    ) : (
                        /* GRID VIEW */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                            {filteredCustomers.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                    No se encontraron clientes.
                                </div>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <div key={customer.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                    {customer.customer_type === 'empresa' ? <Building2 size={20} /> : <User size={20} />}
                                                </div>
                                                <div>
                                                    <div style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{removeEmojis(customer.name)}</div>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{customer.cif}</p>
                                                </div>
                                            </div>
                                            <span style={badgeStyle(customer.status)}>
                                                {statusLabels[customer.status] || customer.status}
                                            </span>
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <MapPin size={14} />
                                                {customer.city ? `${customer.city}, ${customer.province}` : customer.province || 'Sin ubicación'}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                                            <Link to={`/crm/${customer.id}`} className="btn btn-secondary" style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: '0.9rem' }}>
                                                Ver Detalles
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                title="Eliminar cliente"
                message={`¿Estás seguro de eliminar al cliente "${deleteTarget?.name}"? Esta acción borrará también sus contactos y puntos de suministro asociados.`}
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
