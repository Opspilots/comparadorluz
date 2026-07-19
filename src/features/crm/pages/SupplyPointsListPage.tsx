import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Zap, Flame, Trash2, ArrowLeft, Search } from 'lucide-react'
import type { SupplyPoint, Customer } from '@/shared/types'

async function fetchSupplyPointsData(customerId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
    if (!profile?.company_id) throw new Error('Perfil no encontrado')
    const cid = profile.company_id

    const [custRes, spRes] = await Promise.all([
        supabase.from('customers').select('id, name, cif').eq('id', customerId).eq('company_id', cid).single(),
        supabase.from('supply_points').select('*').eq('customer_id', customerId).eq('company_id', cid).order('created_at', { ascending: true }),
    ])

    if (custRes.error) throw custRes.error
    if (spRes.error) throw spRes.error

    return {
        customer: custRes.data as Customer,
        supplyPoints: (spRes.data || []) as SupplyPoint[],
        companyId: cid,
    }
}

const supplyTypeLabel = (type: SupplyPoint['supply_type']) => {
    if (type === 'gas') return { label: 'Gas', icon: <Flame size={13} />, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' }
    return { label: 'Electricidad', icon: <Zap size={13} />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }
}

export function SupplyPointsListPage() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data, isLoading, error } = useQuery({
        queryKey: ['supply-points-list', customerId],
        queryFn: () => fetchSupplyPointsData(customerId!),
        enabled: !!customerId,
    })

    const deleteMutation = useMutation({
        mutationFn: async (spId: string) => {
            const { error } = await supabase.from('supply_points').delete().eq('id', spId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supply-points-list', customerId] })
            queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] })
            toast({ title: 'Punto de suministro eliminado' })
        },
        onError: (err) => {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al eliminar', variant: 'destructive' })
        },
    })

    if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando puntos de suministro...</div>
    if (error || !data) return <div style={{ padding: '2rem', color: '#dc2626' }}>Error al cargar los puntos de suministro.</div>

    const { customer, supplyPoints } = data

    const handleDelete = (sp: SupplyPoint) => {
        if (!confirm(`¿Eliminar el punto de suministro ${sp.cups || sp.address}?`)) return
        deleteMutation.mutate(sp.id)
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Puntos de Suministro</h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {customer.name} · {supplyPoints.length} punto{supplyPoints.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/crm/${customerId}/supply-points/new`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Plus size={15} /> Añadir Punto
                    </button>
                </div>
            </div>

            {/* Table */}
            {supplyPoints.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '1rem' }}>No hay puntos de suministro registrados para este cliente.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/crm/${customerId}/supply-points/new`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Plus size={15} /> Añadir primer punto
                    </button>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                                {['CUPS', 'Dirección', 'Tipo', 'Distribuidora', 'Consumo (kWh/año)', 'Potencia (kW)', 'Acciones'].map((h) => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {supplyPoints.map((sp, idx) => {
                                const typeInfo = supplyTypeLabel(sp.supply_type)
                                return (
                                    <tr
                                        key={sp.id}
                                        style={{
                                            borderBottom: idx < supplyPoints.length - 1 ? '1px solid var(--border-light)' : 'none',
                                        }}
                                        // Background hover handled by the global `tbody tr:hover` rule
                                        // in index.css (already matches var(--color-background)) — no
                                        // need to mutate inline style on mouse events.
                                    >
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {sp.cups || '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {sp.address}
                                            </div>
                                            {sp.city && <div style={{ fontSize: '0.75rem' }}>{sp.postal_code} {sp.city}</div>}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', background: typeInfo.bg, color: typeInfo.color, fontSize: '0.75rem', fontWeight: 600, borderRadius: '9999px', border: `1px solid ${typeInfo.border}` }}>
                                                {typeInfo.icon} {typeInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            {sp.distributor || sp.current_supplier || '—'}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-main)', textAlign: 'right' }}>
                                            {sp.annual_consumption_kwh?.toLocaleString('es-ES') || '—'}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-main)', textAlign: 'right' }}>
                                            {sp.contracted_power_kw?.toLocaleString('es-ES') || '—'}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                                {sp.cups && (
                                                    <Link
                                                        to={`/comparator?cups=${sp.cups}&customerId=${customerId}`}
                                                        title="Comparar tarifas"
                                                        style={{ padding: '0.375rem', color: '#2563eb', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                                                    >
                                                        <Search size={15} />
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(sp)}
                                                    disabled={deleteMutation.isPending}
                                                    title="Eliminar punto de suministro"
                                                    style={{ padding: '0.375rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
