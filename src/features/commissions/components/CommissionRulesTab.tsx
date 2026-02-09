
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { CommissionRule } from '@/shared/types'
import { CreateRuleDialog } from './CreateRuleDialog'
import { Plus, Trash2 } from 'lucide-react'

export function CommissionRulesTab() {
    const [rules, setRules] = useState<CommissionRule[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    useEffect(() => {
        fetchRules()
    }, [])

    const fetchRules = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('commission_rules')
            .select(`
                *,
                users ( full_name )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching commission rules:', error)
        } else {
            setRules(data || [])
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de desactivar esta regla?')) return

        const { error } = await supabase
            .from('commission_rules')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            alert('Error al desactivar la regla')
        } else {
            fetchRules()
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Reglas de Comisionado</h2>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn btn-primary"
                    style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                    <Plus size={16} />
                    Nueva Regla
                </button>
            </div>

            {loading ? (
                <div>Cargando reglas...</div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Comercial</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Comercializadora</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Tarifa</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>% Comisión</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Estado</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                        No hay reglas definidas
                                    </td>
                                </tr>
                            ) : (
                                rules.map((rule: any) => (
                                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>{rule.users?.full_name || 'Desconocido'}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>{rule.supplier_name || 'Todas'}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>{rule.tariff_type || 'Todas'}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{rule.commission_pct}%</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                background: rule.is_active ? '#dcfce7' : '#f1f5f9',
                                                color: rule.is_active ? '#166534' : '#64748b',
                                                fontWeight: 500
                                            }}>
                                                {rule.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            {rule.is_active && (
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                    title="Desactivar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateRuleDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchRules}
            />
        </div>
    )
}
