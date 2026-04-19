
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { CommissionRule } from '@/shared/types'
import { CreateRuleDialog } from './CreateRuleDialog'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/shared/lib/errors'
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'

interface CommissionRulesTabProps {
    commissionerId?: string
}

export function CommissionRulesTab({ commissionerId }: CommissionRulesTabProps = {}) {
    const [rules, setRules] = useState<CommissionRule[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<string | null>(null)
    const [editPct, setEditPct] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const { toast } = useToast()

    const [companyId, setCompanyId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase.from('users').select('company_id').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
                if (profile?.company_id) setCompanyId(profile.company_id)
            })
        })
    }, [])

    const fetchRules = useCallback(async () => {
        if (!companyId) return
        setLoading(true)
        let query = supabase
            .from('commission_rules')
            .select(`
                *,
                commissioners ( full_name )
            `)
            .eq('company_id', companyId)

        if (commissionerId) {
            query = query.eq('commissioner_id', commissionerId)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching commission rules:', error)
        } else {
            setRules(data || [])
        }
        setLoading(false)
    }, [commissionerId, companyId])

    useEffect(() => {
        if (companyId) fetchRules()
    }, [fetchRules, companyId])

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        if (!companyId) return
        const { error } = await supabase
            .from('commission_rules')
            .update({ is_active: !currentActive })
            .eq('id', id)
            .eq('company_id', companyId)

        if (error) {
            toast({ title: 'Error', description: 'No se pudo cambiar el estado de la regla', variant: 'destructive' })
        } else {
            toast({ title: currentActive ? 'Regla desactivada' : 'Regla activada', description: 'El estado se ha actualizado correctamente' })
            void fetchRules()
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        if (!companyId) return

        const { error } = await supabase
            .from('commission_rules')
            .delete()
            .eq('id', deleteTarget)
            .eq('company_id', companyId)

        if (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la regla: ' + getErrorMessage(error), variant: 'destructive' })
        } else {
            toast({ title: 'Regla eliminada', description: 'La regla se ha eliminado permanentemente' })
            fetchRules()
        }
        setDeleteTarget(null)
    }

    const handleStartEdit = (rule: CommissionRule) => {
        setEditingRule(rule.id)
        setEditPct(String(rule.commission_pct))
    }

    const handleSaveEdit = async (id: string) => {
        if (!companyId) return
        const pct = parseFloat(editPct)
        if (isNaN(pct) || pct < 0 || pct > 100) {
            toast({ title: 'Error', description: 'El porcentaje debe ser un número entre 0 y 100', variant: 'destructive' })
            return
        }

        const { error } = await supabase
            .from('commission_rules')
            .update({ commission_pct: pct })
            .eq('id', id)
            .eq('company_id', companyId)

        if (error) {
            toast({ title: 'Error', description: 'No se pudo actualizar la regla: ' + getErrorMessage(error), variant: 'destructive' })
        } else {
            toast({ title: 'Regla actualizada', description: `Porcentaje cambiado a ${pct}%` })
            setEditingRule(null)
            fetchRules()
        }
    }

    const handleCancelEdit = () => {
        setEditingRule(null)
        setEditPct('')
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Reglas de Comisión</div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="btn btn-primary"
                    style={{ gap: '0.5rem', display: 'flex', alignItems: 'center', padding: '0.625rem 1rem' }}
                >
                    <Plus size={16} />
                    Nueva Regla
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando reglas...</div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                {!commissionerId && <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comercial</th>}
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comercializadora</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarifa</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Comisión</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={commissionerId ? 5 : 6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                        No hay reglas definidas. Haz clic en "Nueva Regla" para crear una.
                                    </td>
                                </tr>
                            ) : (
                                rules.map((rule) => (
                                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {!commissionerId && <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{rule.commissioners?.full_name || 'Desconocido'}</td>}
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{rule.supplier_name || 'Todas'}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{rule.tariff_type || 'Todas'}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            {editingRule === rule.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={editPct}
                                                        onChange={e => setEditPct(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveEdit(rule.id)
                                                            if (e.key === 'Escape') handleCancelEdit()
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '80px',
                                                            padding: '0.3rem 0.5rem',
                                                            border: '2px solid #0ea5e9',
                                                            borderRadius: '6px',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 600,
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>%</span>
                                                    <button
                                                        onClick={() => handleSaveEdit(rule.id)}
                                                        style={{
                                                            padding: '0.2rem 0.5rem',
                                                            background: '#0ea5e9',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        style={{
                                                            padding: '0.2rem 0.5rem',
                                                            background: '#f1f5f9',
                                                            color: '#64748b',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a' }}>
                                                    {rule.commission_pct}%
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                background: rule.is_active ? '#dcfce7' : '#fee2e2',
                                                color: rule.is_active ? '#166534' : '#991b1b',
                                                fontWeight: 500
                                            }}>
                                                {rule.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: rule.is_active ? '#10b981' : '#94a3b8',
                                                        display: 'flex', alignItems: 'center', padding: '0.25rem'
                                                    }}
                                                    title={rule.is_active ? 'Desactivar regla' : 'Activar regla'}
                                                >
                                                    {rule.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(rule)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#0ea5e9', display: 'flex', alignItems: 'center', padding: '0.25rem'
                                                    }}
                                                    title="Editar porcentaje"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(rule.id)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#ef4444', display: 'flex', alignItems: 'center', padding: '0.25rem'
                                                    }}
                                                    title="Eliminar regla"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                presetCommissionerId={commissionerId}
            />

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                title="Eliminar regla"
                message="¿Estás seguro de eliminar esta regla permanentemente? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
