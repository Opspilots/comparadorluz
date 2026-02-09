import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Customer } from '@/shared/types'
import { Link } from 'react-router-dom'
import { LayoutGrid, List as ListIcon, Plus, Search, MapPin, Building2, User, Pencil, Trash2, Eye } from 'lucide-react'

export function CustomerList() {
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) console.error(error)
        else setCustomers(data || [])
        setLoading(false)
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cif.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'cliente': return '#10b981'
            case 'perdido': return '#ef4444'
            case 'propuesta': return '#0ea5e9'
            case 'negociacion': return '#f59e0b'
            case 'contactado': return '#8b5cf6'
            default: return '#64748b'
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

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar al cliente "${name}"? Esta acción borrará también sus contactos y puntos de suministro asociados.`)) {
            const { error } = await supabase.from('customers').delete().eq('id', id)
            if (error) {
                console.error('Error deleting customer:', error)
                alert('No se pudo eliminar al cliente.')
            } else {
                fetchCustomers()
            }
        }
    }

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o NIF/CIF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white' }}
                    />
                </div>

                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '6px' }}>
                    <button
                        onClick={() => setViewMode('list')}
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

                <Link to="/crm/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
                    <Plus size={18} /> Nuevo Cliente
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner">Cargando...</div>
                </div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: 'var(--border-light)', borderBottom: '1px solid var(--border)' }}>
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
                                                    <code style={{ background: 'var(--background)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{customer.cif}</code>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{customer.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.customer_type === 'particular' ? 'Particular' : 'Empresa'}</div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: `${getStatusColor(customer.status)}15`,
                                                        color: getStatusColor(customer.status),
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.025em'
                                                    }}>
                                                        {statusLabels[customer.status] || customer.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{customer.city ? `${customer.city}, ${customer.province}` : customer.province || '-'}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <Link
                                                            to={`/crm/${customer.id}`}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                                                            title="Ver Detalle"
                                                        >
                                                            <Eye size={14} />
                                                        </Link>
                                                        <Link
                                                            to={`/crm/${customer.id}/edit`}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Editar"
                                                        >
                                                            <Pencil size={14} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(customer.id, customer.name)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Eliminar"
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
                    ) : (
                        /* GRID VIEW */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {filteredCustomers.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    No se encontraron clientes.
                                </div>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <div key={customer.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                    {customer.customer_type === 'empresa' ? <Building2 size={20} /> : <User size={20} />}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{customer.name}</h3>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{customer.cif}</p>
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                background: `${getStatusColor(customer.status)}15`,
                                                color: getStatusColor(customer.status),
                                                textTransform: 'uppercase'
                                            }}>
                                                {customer.status}
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
        </div>
    )
}
