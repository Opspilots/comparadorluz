import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Contract } from '@/shared/types'
import { Pencil, Trash2, LayoutGrid, List as ListIcon, Plus, Eye, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { removeEmojis } from '@/shared/lib/utils'

export function ContractList() {
    const [loading, setLoading] = useState(true)
    const [contracts, setContracts] = useState<Contract[]>([])
    const [filter, setFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchContracts()
    }, [])

    const fetchContracts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('contracts')
            .select(`
                *,
                customers (name, cif),
                supply_points (cups),
                tariff_versions (
                    tariff_name,
                    suppliers (name)
                )
            `)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching contracts:', error)
        else setContracts(data || [])
        setLoading(false)
    }

    const filteredContracts = filter === 'all'
        ? contracts
        : contracts.filter(c => c.status === filter)

    // Spanish translations for status
    const statusLabels: Record<string, string> = {
        'pending': 'Pendiente',
        'signed': 'Firmado',
        'active': 'Activo',
        'cancelled': 'Cancelado',
        'completed': 'Completado'
    }

    const filterLabels: Record<string, string> = {
        'all': 'Todos',
        'pending': 'Pendiente',
        'signed': 'Firmado',
        'active': 'Activo',
        'cancelled': 'Cancelado'
    }

    // Helper for inline styles (since we don't have full Tailwind config yet)
    const badgeStyle = (status: string) => {
        const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, border: '1px solid transparent' }
        switch (status) {
            case 'active': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
            case 'signed': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
            case 'pending': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
            case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
            default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const { error } = await supabase.from('contracts').delete().eq('id', deleteTarget)
        if (error) {
            console.error(error)
            toast({ title: 'Error', description: 'No se pudo eliminar el contrato.', variant: 'destructive' })
        } else {
            toast({ title: 'Contrato eliminado', description: 'El contrato se ha eliminado correctamente.' })
            fetchContracts()
        }
        setDeleteTarget(null)
    }


    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div></div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Filters */}
                    <div className="tour-contracts-filters" style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
                        {['all', 'pending', 'signed', 'active', 'cancelled'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: filter === f ? 'white' : 'transparent',
                                    color: filter === f ? '#111827' : '#6b7280',
                                    boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {filterLabels[f]}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.4rem',
                                border: 'none',
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                borderRadius: '6px',
                                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: viewMode === 'list' ? '#111827' : '#6b7280'
                            }}
                            title="Vista Lista"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            style={{
                                padding: '0.4rem',
                                border: 'none',
                                background: viewMode === 'board' ? 'white' : 'transparent',
                                borderRadius: '6px',
                                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: viewMode === 'board' ? '#111827' : '#6b7280'
                            }}
                            title="Vista Tablero"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <Link to="/contracts/new" className="btn btn-primary tour-contracts-new-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}>
                        <Plus size={18} /> Nuevo Contrato
                    </Link>
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden', background: viewMode === 'board' ? 'transparent' : 'white', border: viewMode === 'board' ? 'none' : '1px solid var(--border)', boxShadow: viewMode === 'board' ? 'none' : 'var(--shadow-sm)' }}>

                {/* View Content */}
                {viewMode === 'list' ? (
                    /* LIST VIEW */
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'var(--border-light)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ref. Contrato</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comercializadora / Tarifa</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CUPS</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Valor Mensual</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Firmado</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anotaciones</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} style={{ padding: '4rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando contratos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No hay contratos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContracts.map((contract) => (
                                        <tr key={contract.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                                {contract.contract_number || '---'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 500 }}>{removeEmojis(contract.customers?.name || 'Cliente desconocido')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contract.customers?.cif}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 500 }}>{removeEmojis(contract.tariff_versions?.suppliers?.name || '')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{removeEmojis(contract.tariff_versions?.tariff_name || '')}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {((contract as unknown as { supply_points?: { cups?: string } }).supply_points?.cups) || '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={badgeStyle(contract.status)}>
                                                    {statusLabels[contract.status] || contract.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600 }}>
                                                {contract.annual_value_eur ? (contract.annual_value_eur / 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {contract.signed_at || '-'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contract.notes || ''}>
                                                {contract.notes || '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <Link
                                                        to={`/contracts/${contract.id}/view`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                                                        title="Ver"
                                                    >
                                                        <Eye size={14} />
                                                    </Link>
                                                    <Link
                                                        to={`/contracts/${contract.id}`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Editar"
                                                    >
                                                        <Pencil size={14} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteTarget(contract.id)}
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
                    /* BOARD VIEW */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {loading ? (
                            <div style={{ gridColumn: '1/-1', padding: '2rem', textAlign: 'center' }}>Cargando contratos...</div>
                        ) : filteredContracts.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                No hay contratos registrados con estos filtros.
                            </div>
                        ) : (
                            filteredContracts.map((contract) => (
                                <div key={contract.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={badgeStyle(contract.status)}>{statusLabels[contract.status] || contract.status}</span>
                                            <div style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', fontWeight: 'bold' }}>{removeEmojis(contract.customers?.name || '')}</div>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{contract.customers?.cif}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <Link
                                                to={`/contracts/${contract.id}/view`}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.3rem', fontSize: '0.8rem', border: 'none', background: 'transparent' }}
                                                title="Ver"
                                            >
                                                <Eye size={16} color="var(--primary)" />
                                            </Link>
                                            <Link
                                                to={`/contracts/${contract.id}`}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.3rem', fontSize: '0.8rem', border: 'none', background: 'transparent' }}
                                                title="Editar"
                                            >
                                                <Pencil size={16} color="#64748b" />
                                            </Link>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '6px', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tarifa:</span>
                                            <span style={{ fontWeight: 500 }}>{removeEmojis(contract.tariff_versions?.tariff_name || '')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Comercializadora:</span>
                                            <span style={{ fontWeight: 500 }}>{removeEmojis(contract.tariff_versions?.suppliers?.name || '')}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VALOR MENSUAL</div>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{contract.annual_value_eur ? (contract.annual_value_eur / 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {contract.signed_at ? `Firmado: ${contract.signed_at}` : 'Sin fecha'}
                                        </div>
                                    </div>
                                    {contract.notes && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contract.notes}>
                                            📝 {contract.notes}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                title="Eliminar contrato"
                message="¿Estás seguro de eliminar este contrato? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
