import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { FileText, Users, BarChart2, Zap, Activity, ChevronRight, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AuditLog {
    id: string
    action: string
    entity_type: string
    entity_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
}

const entityIcon = (entityType: string) => {
    switch (entityType) {
        case 'customer': return <Users size={16} />
        case 'contract': return <FileText size={16} />
        case 'comparison': return <BarChart2 size={16} />
        case 'supply_point': return <Zap size={16} />
        default: return <Activity size={16} />
    }
}

const entityColor = (entityType: string) => {
    switch (entityType) {
        case 'customer': return { bg: '#f0fdf4', color: '#16a34a' }
        case 'contract': return { bg: '#eff6ff', color: '#2563eb' }
        case 'comparison': return { bg: '#fdf4ff', color: '#9333ea' }
        case 'supply_point': return { bg: '#fff7ed', color: '#ea580c' }
        default: return { bg: 'var(--primary-light)', color: 'var(--color-primary)' }
    }
}

const actionLabel = (action: string, entityType: string, metadata: Record<string, unknown> | null): string => {
    const name = (metadata?.name || metadata?.customer_name || metadata?.cups || '') as string
    const suffix = name ? ` — ${name}` : ''

    switch (action) {
        case 'create':
        case 'created': {
            const entityLabels: Record<string, string> = {
                customer: 'Cliente añadido',
                contract: 'Contrato creado',
                comparison: 'Comparativa realizada',
                supply_point: 'Punto de suministro añadido',
            }
            return (entityLabels[entityType] || 'Registro creado') + suffix
        }
        case 'update':
        case 'updated': {
            const entityLabels: Record<string, string> = {
                customer: 'Cliente actualizado',
                contract: 'Contrato actualizado',
                comparison: 'Comparativa actualizada',
                supply_point: 'Punto de suministro actualizado',
            }
            return (entityLabels[entityType] || 'Registro actualizado') + suffix
        }
        case 'delete':
        case 'deleted':
            return 'Registro eliminado' + suffix
        case 'signed':
            return 'Contrato firmado' + suffix
        case 'activate':
        case 'activated':
            return 'Contrato activado' + suffix
        default:
            return action + suffix
    }
}

const entityLink = (entityType: string, entityId: string | null): string | null => {
    if (!entityId) return null
    switch (entityType) {
        case 'customer': return `/crm/${entityId}`
        case 'contract': return `/contracts/${entityId}`
        default: return null
    }
}

async function fetchRecentActivity(): Promise<AuditLog[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
    if (!profile?.company_id) return []

    const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, metadata, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        // Fallback: recent contracts
        const { data: contracts } = await supabase
            .from('contracts')
            .select('id, created_at, status, customers(name)')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })
            .limit(10)

        return (contracts || []).map((c) => {
            const cTyped = c as { id: string; created_at: string; status: string; customers: { name?: string } | null }
            return {
                id: cTyped.id,
                action: 'create',
                entity_type: 'contract',
                entity_id: cTyped.id,
                metadata: { name: cTyped.customers?.name || '' },
                created_at: cTyped.created_at,
            }
        })
    }

    return data || []
}

export function RecentActivity() {
    const { data: activities = [], isLoading, isError } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: fetchRecentActivity,
        staleTime: 1000 * 60 * 2,
    })

    if (isLoading) {
        return (
            <div className="card" style={{ padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Cargando actividad...
            </div>
        )
    }

    if (isError) {
        return (
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>No se pudo cargar la actividad reciente.</span>
            </div>
        )
    }

    return (
        <div className="card">
            <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Actividad Reciente</div>
            </div>
            <div>
                {activities.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay actividad reciente
                    </div>
                ) : (
                    activities.map((item) => {
                        const colors = entityColor(item.entity_type)
                        const link = entityLink(item.entity_type, item.entity_id)
                        const label = actionLabel(item.action, item.entity_type, item.metadata)
                        const dateStr = new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

                        const inner = (
                            <>
                                <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    background: colors.bg,
                                    color: colors.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {entityIcon(item.entity_type)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {label}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {dateStr}
                                    </div>
                                </div>
                                {link && <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                            </>
                        )

                        const rowStyle: React.CSSProperties = {
                            padding: '0.875rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.875rem',
                            borderBottom: '1px solid var(--border-light)',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'background 0.15s',
                            cursor: link ? 'pointer' : 'default',
                        }

                        if (link) {
                            return (
                                <Link
                                    key={item.id}
                                    to={link}
                                    className="row-hover-bg"
                                    style={rowStyle}
                                >
                                    {inner}
                                </Link>
                            )
                        }

                        return (
                            <div
                                key={item.id}
                                className="row-hover-bg"
                                style={rowStyle}
                            >
                                {inner}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
