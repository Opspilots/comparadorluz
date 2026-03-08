import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Contract, SwitchingStatus } from '@/shared/types'
import { useToast } from '@/hooks/use-toast'
import {
    ArrowRightLeft,
    Clock,
    RefreshCw,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Loader2,
    ExternalLink,
    Building2,
    FileText,
} from 'lucide-react'

interface SwitchingTrackerProps {
    contract: Contract & {
        switching_from_contract_id?: string | null
        switching_notes?: string | null
        switching_completed_at?: string | null
        estimated_activation_date?: string | null
    }
    onStatusChange?: () => void
}

const STEPS: { key: SwitchingStatus; label: string; description: string }[] = [
    { key: 'requested', label: 'Solicitado', description: 'Traspaso solicitado a la distribuidora' },
    { key: 'in_progress', label: 'En Proceso', description: 'ATR en tramite con la distribuidora' },
    { key: 'completed', label: 'Completado', description: 'Suministro activado con nueva comercializadora' },
]

const STATUS_ICON: Record<string, typeof Clock> = {
    requested: Clock,
    in_progress: RefreshCw,
    completed: CheckCircle2,
    rejected: XCircle,
}

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
    requested: { text: '#b45309', bg: '#fef3c7', border: '#fde68a', dot: '#f59e0b' },
    in_progress: { text: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', dot: '#3b82f6' },
    completed: { text: '#15803d', bg: '#dcfce7', border: '#bbf7d0', dot: '#10b981' },
    rejected: { text: '#b91c1c', bg: '#fee2e2', border: '#fecaca', dot: '#ef4444' },
}

export function SwitchingTracker({ contract, onStatusChange }: SwitchingTrackerProps) {
    const { toast } = useToast()
    const [updating, setUpdating] = useState(false)
    const [linkedContract, setLinkedContract] = useState<Contract | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const status = contract.switching_status
    if (!status) return null

    const statusIndex = STEPS.findIndex(s => s.key === status)
    const isRejected = status === 'rejected'
    const colors = STATUS_COLORS[status] || STATUS_COLORS.requested

    // Check admin role and fetch linked contract
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                if (profile?.role === 'admin' || profile?.role === 'manager') {
                    setIsAdmin(true)
                }
            }

            // Find the new contract that was created from this one
            const { data: newContract } = await supabase
                .from('contracts')
                .select(`
                    *,
                    tariff_versions (*, suppliers (*))
                `)
                .eq('switching_from_contract_id', contract.id)
                .maybeSingle()

            if (newContract) setLinkedContract(newContract)
        }
        init()
    }, [contract.id])

    const advanceStatus = async (newStatus: SwitchingStatus) => {
        setUpdating(true)
        try {
            const updateData: Record<string, unknown> = {
                switching_status: newStatus,
            }
            if (newStatus === 'completed') {
                updateData.switching_completed_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('contracts')
                .update(updateData)
                .eq('id', contract.id)

            if (error) throw error

            // If completed, also activate the new contract
            if (newStatus === 'completed' && linkedContract) {
                await supabase
                    .from('contracts')
                    .update({ status: 'active' })
                    .eq('id', linkedContract.id)
            }

            // If rejected, cancel the new contract
            if (newStatus === 'rejected' && linkedContract) {
                await supabase
                    .from('contracts')
                    .update({ status: 'cancelled' })
                    .eq('id', linkedContract.id)
            }

            toast({
                title: 'Estado actualizado',
                description: `Traspaso marcado como: ${STEPS.find(s => s.key === newStatus)?.label || newStatus}`,
            })
            onStatusChange?.()
        } catch (err) {
            const e = err as Error
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setUpdating(false)
        }
    }

    const nextStatus = (): SwitchingStatus | null => {
        if (status === 'requested') return 'in_progress'
        if (status === 'in_progress') return 'completed'
        return null
    }

    return (
        <div
            className="rounded-[14px] overflow-hidden"
            style={{
                border: `1px solid ${colors.border}`,
                background: '#fff',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
            }}
        >
            {/* Header */}
            <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg"
                        style={{ background: colors.dot, boxShadow: `0 2px 6px ${colors.dot}40` }}
                    >
                        <ArrowRightLeft size={15} color="#fff" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                            Traspaso de Comercializadora
                        </div>
                        <div className="text-xs" style={{ color: '#64748b' }}>
                            {contract.switching_requested_at
                                ? `Iniciado el ${new Date(contract.switching_requested_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                : 'Fecha no registrada'}
                        </div>
                    </div>
                </div>

                {/* Current status badge */}
                <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}
                >
                    {(() => { const Icon = STATUS_ICON[status]; return <Icon size={12} /> })()}
                    {STEPS.find(s => s.key === status)?.label || (isRejected ? 'Rechazado' : status)}
                </div>
            </div>

            {/* Timeline */}
            <div className="px-5 py-5">
                <div className="flex items-start gap-0">
                    {STEPS.map((step, i) => {
                        const isActive = step.key === status
                        const isPast = statusIndex > i
                        const isFuture = statusIndex < i
                        const StepIcon = STATUS_ICON[step.key]
                        const stepColors = STATUS_COLORS[step.key]

                        return (
                            <div key={step.key} className="flex items-start flex-1 min-w-0">
                                {/* Step node */}
                                <div className="flex flex-col items-center" style={{ width: 40 }}>
                                    <div
                                        className="flex items-center justify-center rounded-full transition-all"
                                        style={{
                                            width: isActive ? 36 : 28,
                                            height: isActive ? 36 : 28,
                                            background: isActive ? stepColors.bg
                                                : isPast ? '#dcfce7'
                                                : isRejected ? '#fee2e2'
                                                : '#f1f5f9',
                                            border: `2px solid ${isActive ? stepColors.dot
                                                : isPast ? '#10b981'
                                                : isRejected ? '#fecaca'
                                                : '#e2e8f0'}`,
                                            boxShadow: isActive ? `0 0 0 4px ${stepColors.dot}15` : 'none',
                                        }}
                                    >
                                        {isPast ? (
                                            <CheckCircle2 size={14} color="#10b981" />
                                        ) : (
                                            <StepIcon
                                                size={isActive ? 16 : 13}
                                                color={isActive ? stepColors.dot : isFuture ? '#cbd5e1' : '#fca5a5'}
                                                className={isActive && step.key === 'in_progress' ? 'animate-spin' : ''}
                                                style={isActive && step.key === 'in_progress' ? { animationDuration: '3s' } : {}}
                                            />
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <div
                                            className="text-xs font-semibold leading-tight"
                                            style={{ color: isActive ? stepColors.text : isPast ? '#15803d' : '#94a3b8' }}
                                        >
                                            {step.label}
                                        </div>
                                        <div
                                            className="text-[10px] mt-0.5 leading-snug max-w-[100px]"
                                            style={{ color: isActive ? '#64748b' : '#cbd5e1' }}
                                        >
                                            {step.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector line */}
                                {i < STEPS.length - 1 && (
                                    <div
                                        className="flex-1 mt-3.5"
                                        style={{
                                            height: 2,
                                            background: isPast
                                                ? 'linear-gradient(90deg, #10b981, #10b981)'
                                                : isActive
                                                ? `linear-gradient(90deg, ${stepColors.dot}, #e2e8f0)`
                                                : '#e2e8f0',
                                            borderRadius: 1,
                                            minWidth: 20,
                                        }}
                                    />
                                )}
                            </div>
                        )
                    })}

                    {/* Rejected overlay */}
                    {isRejected && (
                        <div className="flex flex-col items-center ml-2" style={{ width: 40 }}>
                            <div
                                className="flex items-center justify-center rounded-full"
                                style={{
                                    width: 36,
                                    height: 36,
                                    background: '#fee2e2',
                                    border: '2px solid #ef4444',
                                    boxShadow: '0 0 0 4px rgba(239,68,68,0.08)',
                                }}
                            >
                                <XCircle size={16} color="#ef4444" />
                            </div>
                            <div className="mt-2 text-center">
                                <div className="text-xs font-semibold" style={{ color: '#b91c1c' }}>Rechazado</div>
                                <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>Traspaso denegado</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Linked contract info */}
            {linkedContract && (
                <div
                    className="mx-5 mb-4 rounded-xl p-3.5 flex items-center justify-between"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Building2 size={14} style={{ color: '#64748b' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#94a3b8' }}>Nuevo contrato</div>
                                <div className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                                    {linkedContract.tariff_versions?.suppliers?.name || linkedContract.tariff_versions?.supplier_name || '—'}
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                        <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: '#64748b' }} />
                            <div>
                                <div className="text-xs" style={{ color: '#94a3b8' }}>Tarifa</div>
                                <div className="text-sm font-medium" style={{ color: '#0f172a' }}>
                                    {linkedContract.tariff_versions?.tariff_name || '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link
                        to={`/contracts/${linkedContract.id}/view`}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                        style={{ color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe' }}
                    >
                        <ExternalLink size={12} />
                        Ver contrato
                    </Link>
                </div>
            )}

            {/* Estimated activation date */}
            {contract.estimated_activation_date && (
                <div className="mx-5 mb-4 flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                    <Clock size={12} />
                    Activacion estimada: {new Date(contract.estimated_activation_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            )}

            {/* Switching notes */}
            {contract.switching_notes && (
                <div
                    className="mx-5 mb-4 rounded-lg p-3 text-xs"
                    style={{ background: '#fafbfc', border: '1px dashed #e2e8f0', color: '#64748b' }}
                >
                    <span className="font-semibold" style={{ color: '#475569' }}>Notas:</span> {contract.switching_notes}
                </div>
            )}

            {/* Admin actions */}
            {isAdmin && !isRejected && status !== 'completed' && (
                <div
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}
                >
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                        Acciones de administracion
                    </span>
                    <div className="flex items-center gap-2">
                        {nextStatus() && (
                            <button
                                onClick={() => advanceStatus(nextStatus()!)}
                                disabled={updating}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: '#2563eb',
                                    color: '#fff',
                                    cursor: updating ? 'not-allowed' : 'pointer',
                                    opacity: updating ? 0.7 : 1,
                                    boxShadow: '0 1px 4px rgba(37,99,235,0.25)',
                                }}
                            >
                                {updating ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                                Avanzar a {STEPS.find(s => s.key === nextStatus())?.label}
                            </button>
                        )}
                        <button
                            onClick={() => advanceStatus('rejected')}
                            disabled={updating}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all"
                            style={{
                                background: '#fff',
                                color: '#ef4444',
                                border: '1px solid #fecaca',
                                cursor: updating ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <XCircle size={13} />
                            Rechazar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
