import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Contract } from '@/shared/types'
import { Pencil, Trash2, LayoutGrid, List as ListIcon, Plus, Eye, Loader2, ArrowRightLeft, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { SwitchingDialog } from './SwitchingDialog'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { removeEmojis } from '@/shared/lib/utils'
import type { SwitchingStatus } from '@/shared/types'

const PAGE_SIZE = 50

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

type ContractWithRelations = Contract & {
    customers?: { name: string; cif: string }
    supply_points?: { cups?: string }
    tariff_versions?: { tariff_name: string; supplier_name?: string; suppliers?: { name: string } }
}

export function ContractList() {
    const [filter, setFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const [switchingContract, setSwitchingContract] = useState<ContractWithRelations | null>(null)
    const [switchingActionContract, setSwitchingActionContract] = useState<ContractWithRelations | null>(null)
    const [switchingUpdating, setSwitchingUpdating] = useState(false)
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const { data: contracts = [], isLoading: loading } = useQuery({
        queryKey: ['contracts'],
        queryFn: async () => {
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
                .limit(PAGE_SIZE)

            if (error) throw error
            return (data || []) as ContractWithRelations[]
        },
    })

    const filteredContracts = filter === 'all'
        ? contracts
        : contracts.filter(c => c.status === filter)

    const handleAdvanceSwitching = async (contract: Contract, newStatus: SwitchingStatus) => {
        setSwitchingUpdating(true)
        try {
            const updateData: Record<string, unknown> = {
                switching_status: newStatus,
            }
            if (newStatus === 'in_progress' && !contract.switching_deadline_at) {
                const deadline = new Date()
                deadline.setDate(deadline.getDate() + 21)
                updateData.switching_deadline_at = deadline.toISOString()
            }
            if (newStatus === 'completed') {
                updateData.switching_completed_at = new Date().toISOString()
                updateData.activation_date = new Date().toISOString().split('T')[0]
                updateData.status = 'active'
            }
            if (newStatus === 'rejected') {
                updateData.status = 'cancelled'
            }

            const { error } = await supabase
                .from('contracts')
                .update(updateData)
                .eq('id', contract.id)

            if (error) throw error

            toast({
                title: newStatus === 'completed' ? 'Traspaso completado' : 'Estado actualizado',
                description: newStatus === 'completed'
                    ? 'El traspaso se ha completado y el contrato esta activo.'
                    : newStatus === 'rejected'
                        ? 'Traspaso rechazado. El contrato se ha cancelado.'
                        : `Traspaso avanzado a: ${newStatus === 'in_progress' ? 'En Proceso' : newStatus}`,
            })
            setSwitchingActionContract(null)
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
        } catch (err) {
            const e = err as Error
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setSwitchingUpdating(false)
        }
    }

    const getNextSwitchingStatus = (status: SwitchingStatus | null | undefined): SwitchingStatus | null => {
        if (status === 'requested') return 'in_progress'
        if (status === 'in_progress') return 'completed'
        return null
    }

    const switchingStatusLabel: Record<string, string> = {
        requested: 'Solicitado',
        in_progress: 'En Proceso',
        completed: 'Completado',
        rejected: 'Rechazado',
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const { error } = await supabase.from('contracts').delete().eq('id', deleteTarget)
        if (error) {
            console.error(error)
            toast({ title: 'Error', description: 'No se pudo eliminar el contrato.', variant: 'destructive' })
        } else {
            toast({ title: 'Contrato eliminado', description: 'El contrato se ha eliminado correctamente.' })
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
        }
        setDeleteTarget(null)
    }


    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="mobile-actions-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div></div>

                <div className="mobile-actions-wrap" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Filters */}
                    <div className="tour-contracts-filters mobile-filters-scroll" style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
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

            <div className="card" style={{ padding: '0', overflow: 'hidden', background: viewMode === 'board' ? 'transparent' : 'white', border: viewMode === 'board' ? 'none' : '1px solid var(--color-border)', boxShadow: viewMode === 'board' ? 'none' : 'var(--shadow-sm)' }}>

                {/* View Content */}
                {viewMode === 'list' ? (
                    /* LIST VIEW */
                    <div className="responsive-table-wrap" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'var(--border-light)', borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comercializadora / Tarifa</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CUPS</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Valor Mensual</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anotaciones</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando contratos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredContracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No hay contratos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContracts.map((contract) => (
                                        <tr key={contract.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 500 }}>{removeEmojis(contract.customers?.name || 'Cliente desconocido')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contract.customers?.cif}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 500 }}>{removeEmojis(contract.tariff_versions?.suppliers?.name || '')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{removeEmojis(contract.tariff_versions?.tariff_name || '')}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {contract.supply_points?.cups || '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={badgeStyle(contract.status)}>
                                                    {statusLabels[contract.status] || contract.status}
                                                </span>
                                                {contract.switching_status && contract.switching_status !== 'completed' && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                                        marginLeft: 4, padding: '2px 6px', borderRadius: 9999,
                                                        fontSize: '0.65rem', fontWeight: 600,
                                                        background: contract.switching_status === 'rejected' ? '#fee2e2' : '#dbeafe',
                                                        color: contract.switching_status === 'rejected' ? '#b91c1c' : '#1d4ed8',
                                                    }} title={`Switching: ${contract.switching_status}`}>
                                                        <ArrowRightLeft size={10} />
                                                        SW
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600 }}>
                                                {contract.annual_value_eur ? (contract.annual_value_eur / 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contract.notes || ''}>
                                                {contract.notes || '—'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <Link
                                                        to={`/contracts/${contract.id}/view`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}
                                                        title="Ver"
                                                        aria-label="Ver contrato"
                                                    >
                                                        <Eye size={14} />
                                                    </Link>
                                                    <Link
                                                        to={`/contracts/${contract.id}`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Editar"
                                                        aria-label="Editar contrato"
                                                    >
                                                        <Pencil size={14} />
                                                    </Link>
                                                    {(contract.status === 'active' || contract.status === 'signed') && !contract.switching_status && (
                                                        <button
                                                            onClick={() => setSwitchingContract(contract)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', fontSize: '0.8rem', color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Iniciar Traspaso"
                                                        >
                                                            <ArrowRightLeft size={14} />
                                                        </button>
                                                    )}
                                                    {contract.switching_status && contract.switching_status !== 'completed' && contract.switching_status !== 'rejected' && (
                                                        <button
                                                            onClick={() => setSwitchingActionContract(contract)}
                                                            className="btn btn-secondary"
                                                            style={{
                                                                padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 600,
                                                                color: contract.switching_status === 'in_progress' ? '#15803d' : '#1d4ed8',
                                                                borderColor: contract.switching_status === 'in_progress' ? '#bbf7d0' : '#bfdbfe',
                                                                background: contract.switching_status === 'in_progress' ? '#f0fdf4' : '#eff6ff',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                            }}
                                                            title={contract.switching_status === 'in_progress' ? 'Confirmar traspaso completado' : 'Avanzar traspaso'}
                                                        >
                                                            {contract.switching_status === 'in_progress' ? <CheckCircle2 size={13} /> : <ChevronRight size={13} />}
                                                            {contract.switching_status === 'in_progress' ? 'Confirmar' : 'Avanzar'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteTarget(contract.id)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger-light)', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Eliminar"
                                                        aria-label="Eliminar contrato"
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                        {loading ? (
                            <div style={{ gridColumn: '1/-1', padding: '2rem', textAlign: 'center' }}>Cargando contratos...</div>
                        ) : filteredContracts.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
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
                                            {(contract.status === 'active' || contract.status === 'signed') && !contract.switching_status && (
                                                <button
                                                    onClick={() => setSwitchingContract(contract)}
                                                    style={{ padding: '0.3rem', fontSize: '0.8rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                    title="Iniciar Traspaso"
                                                >
                                                    <ArrowRightLeft size={16} color="#2563eb" />
                                                </button>
                                            )}
                                            {contract.switching_status && contract.switching_status !== 'completed' && contract.switching_status !== 'rejected' && (
                                                <button
                                                    onClick={() => setSwitchingActionContract(contract)}
                                                    style={{ padding: '0.3rem', fontSize: '0.8rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                                    title={contract.switching_status === 'in_progress' ? 'Confirmar traspaso' : 'Avanzar traspaso'}
                                                >
                                                    {contract.switching_status === 'in_progress'
                                                        ? <CheckCircle2 size={16} color="#15803d" />
                                                        : <ChevronRight size={16} color="#1d4ed8" />
                                                    }
                                                </button>
                                            )}
                                            <Link
                                                to={`/contracts/${contract.id}/view`}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.3rem', fontSize: '0.8rem', border: 'none', background: 'transparent' }}
                                                title="Ver"
                                            >
                                                <Eye size={16} color="var(--color-primary)" />
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

                                    <div style={{ padding: '1rem', background: 'var(--color-background)', borderRadius: '6px', fontSize: '0.9rem' }}>
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

            {switchingContract && (
                <SwitchingDialog
                    contract={switchingContract}
                    open={!!switchingContract}
                    onOpenChange={(open) => { if (!open) setSwitchingContract(null) }}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
                />
            )}

            {/* Switching Action Dialog — advance or confirm switching */}
            {switchingActionContract && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
                    }}
                    onClick={() => setSwitchingActionContract(null)}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: 14, maxWidth: 440, width: '90%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #f5f3ff 100%)',
                            borderBottom: '1px solid #e2e8f0',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                }}>
                                    <ArrowRightLeft size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#0f172a' }}>
                                        Gestionar Traspaso
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                        {removeEmojis(switchingActionContract.customers?.name || 'Cliente')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.25rem 1.5rem' }}>
                            {/* Current status */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
                                padding: '0.625rem 0.875rem', borderRadius: 10,
                                background: switchingActionContract.switching_status === 'in_progress' ? '#dbeafe' : '#fef3c7',
                                border: `1px solid ${switchingActionContract.switching_status === 'in_progress' ? '#bfdbfe' : '#fde68a'}`,
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: switchingActionContract.switching_status === 'in_progress' ? '#3b82f6' : '#f59e0b',
                                }} />
                                <span style={{
                                    fontSize: '0.8125rem', fontWeight: 600,
                                    color: switchingActionContract.switching_status === 'in_progress' ? '#1d4ed8' : '#b45309',
                                }}>
                                    Estado actual: {switchingStatusLabel[switchingActionContract.switching_status || ''] || switchingActionContract.switching_status}
                                </span>
                            </div>

                            {/* Supplier info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                                <div style={{
                                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8,
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                }}>
                                    <div style={{ fontSize: '0.625rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Desde</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#7f1d1d' }}>
                                        {switchingActionContract.origin_supplier_name || switchingActionContract.supply_points?.current_supplier || '—'}
                                    </div>
                                </div>
                                <ChevronRight size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                                <div style={{
                                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8,
                                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                                }}>
                                    <div style={{ fontSize: '0.625rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Hacia</div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#14532d' }}>
                                        {removeEmojis(switchingActionContract.tariff_versions?.suppliers?.name || switchingActionContract.tariff_versions?.supplier_name || '—')}
                                    </div>
                                </div>
                            </div>

                            {/* Confirmation message for completing */}
                            {switchingActionContract.switching_status === 'in_progress' && (
                                <div style={{
                                    padding: '0.75rem', borderRadius: 10, marginBottom: '1rem',
                                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                                        <CheckCircle2 size={16} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#14532d' }}>
                                                Confirmar traspaso completado
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4 }}>
                                                El contrato se activara con fecha de hoy. Confirma que el suministro esta activo con la nueva comercializadora.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{
                            padding: '0.875rem 1.5rem',
                            borderTop: '1px solid #f1f5f9', background: '#fafbfc',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => {
                                        if (switchingActionContract) handleAdvanceSwitching(switchingActionContract, 'rejected')
                                    }}
                                    disabled={switchingUpdating}
                                    style={{
                                        height: 34, padding: '0 12px', borderRadius: 8, fontSize: '0.8125rem',
                                        fontWeight: 500, border: '1px solid #fecaca', background: '#fff', color: '#ef4444',
                                        cursor: switchingUpdating ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}
                                >
                                    <XCircle size={13} />
                                    Rechazar
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setSwitchingActionContract(null)}
                                    style={{
                                        height: 34, padding: '0 14px', borderRadius: 8, fontSize: '0.8125rem',
                                        fontWeight: 500, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                                {getNextSwitchingStatus(switchingActionContract.switching_status) && (
                                    <button
                                        onClick={() => {
                                            const next = getNextSwitchingStatus(switchingActionContract.switching_status)
                                            if (next) handleAdvanceSwitching(switchingActionContract, next)
                                        }}
                                        disabled={switchingUpdating}
                                        style={{
                                            height: 34, padding: '0 16px', borderRadius: 8, fontSize: '0.8125rem',
                                            fontWeight: 600, border: 'none',
                                            background: switchingActionContract.switching_status === 'in_progress' ? '#15803d' : '#2563eb',
                                            color: '#fff', cursor: switchingUpdating ? 'not-allowed' : 'pointer',
                                            opacity: switchingUpdating ? 0.7 : 1,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            boxShadow: switchingActionContract.switching_status === 'in_progress'
                                                ? '0 2px 8px rgba(21,128,61,0.3)'
                                                : '0 2px 8px rgba(37,99,235,0.3)',
                                        }}
                                    >
                                        {switchingUpdating
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : switchingActionContract.switching_status === 'in_progress'
                                                ? <CheckCircle2 size={14} />
                                                : <ChevronRight size={14} />
                                        }
                                        {switchingUpdating
                                            ? 'Procesando...'
                                            : switchingActionContract.switching_status === 'in_progress'
                                                ? 'Confirmar Completado'
                                                : `Avanzar a ${switchingStatusLabel[getNextSwitchingStatus(switchingActionContract.switching_status) || ''] || ''}`
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
