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
        fetchActivity()
    }, [])

    const fetchActivity = async () => {
        try {
            // Fetch recent contracts
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id, created_at, status, customers(name)')
                .order('created_at', { ascending: false })
                .limit(5)

            if (contracts) {
                const items: ActivityItem[] = contracts.map((c: any) => ({
                    id: c.id,
                    type: 'contract',
                    title: `Contrato para ${c.customers?.name || 'Cliente desconocido'}`,
                    subtitle: `Estado: ${c.status}`,
                    date: c.created_at,
                    status: c.status
                }))
                setActivities(items)
            }
        } catch (error) {
            console.error('Error fetching activity:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando actividad...</div>
    }

    return (
        <div className="card">
            <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Actividad Reciente</div>
                <Link to="/contracts" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}>Ver todo</Link>
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
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
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
