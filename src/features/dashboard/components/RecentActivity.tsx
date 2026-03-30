import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { FileText, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ActivityItem {
    id: string
    type: 'contract' | 'customer'
    title: string
    subtitle: string
    date: string
    status?: string
}

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
                if (!profile?.company_id) return

                // Fetch recent contracts
                const { data: contracts } = await supabase
                    .from('contracts')
                    .select('id, created_at, status, customers(name)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (contracts) {
                    const items: ActivityItem[] = (contracts as { id: string, status: string, created_at: string, customers: { name?: string } | null }[]).map((c) => {
                        const customerName = c.customers?.name || 'Cliente desconocido';
                        return {
                            id: c.id,
                            type: 'contract',
                            title: `Contrato para ${customerName}`,
                            subtitle: `Estado: ${c.status}`,
                            date: c.created_at,
                            status: c.status
                        };
                    });
                    setActivities(items)
                }
            } catch (error) {
                console.error('Error fetching activity:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchActivity()
    }, [])

    if (loading) {
        return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando actividad...</div>
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
                <Link to="/contracts" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Ver todo</Link>
            </div>
            <div>
                {activities.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay actividad reciente
                    </div>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} style={{
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            borderBottom: '1px solid var(--border-light)',
                            transition: 'background 0.2s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                color: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileText size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                    {item.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} • {item.subtitle}
                                </div>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
