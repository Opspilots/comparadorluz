import { useState, useEffect } from 'react'
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
    Building2,
    AlertTriangle,
    Check,
} from 'lucide-react'

interface SwitchingTrackerProps {
    contract: Contract & {
        switching_from_contract_id?: string | null
        switching_notes?: string | null
        switching_completed_at?: string | null
        estimated_activation_date?: string | null
        switching_deadline_at?: string | null
        switching_deadline_warning_sent?: boolean
        integration_id?: string | null
        origin_supplier_name?: string | null
        origin_tariff_name?: string | null
        origin_annual_cost_eur?: number | null
    }
    onStatusChange?: () => void
}

/** Max 21 calendar days for switching (RD 1011/2009) */
const SWITCHING_MAX_DAYS = 21

const STEPS: { key: SwitchingStatus; label: string; description: string }[] = [
    { key: 'requested', label: 'Solicitado', description: 'Traspaso solicitado' },
    { key: 'in_progress', label: 'En Proceso', description: 'ATR en tramite con la distribuidora' },
    { key: 'completed', label: 'Completado', description: 'Suministro activado' },
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
    const [isAdmin, setIsAdmin] = useState(false)
    const [showRejectConfirm, setShowRejectConfirm] = useState(false)
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
    // Bono Social warning
    const [hasBonaSocial, setHasBonaSocial] = useState(false)

    const status = contract.switching_status

    // Calculate 21-day deadline (RD 1011/2009)
    const deadlineAt = contract.switching_deadline_at
        ? new Date(contract.switching_deadline_at)
        : contract.switching_requested_at
            ? new Date(new Date(contract.switching_requested_at).getTime() + SWITCHING_MAX_DAYS * 24 * 60 * 60 * 1000)
            : null
    const now = new Date()
    const daysRemaining = deadlineAt ? Math.ceil((deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    const isDeadlineClose = daysRemaining !== null && daysRemaining <= 5 && daysRemaining > 0
    const isDeadlineExpired = daysRemaining !== null && daysRemaining <= 0

    const destinationSupplier = contract.tariff_versions?.suppliers?.name || contract.tariff_versions?.supplier_name || '—'
    const destinationTariff = contract.tariff_versions?.tariff_name || '—'
    const originSupplier = contract.origin_supplier_name || contract.supply_points?.current_supplier || '—'

    // Check admin role + API capability
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()
                if (profile?.role === 'admin' || profile?.role === 'manager') {
                    setIsAdmin(true)
                }
            }

            // Check Bono Social on supply point (RD 897/2017)
            if (contract.supply_point_id) {
                const { data: sp } = await supabase
                    .from('supply_points')
                    .select('has_bono_social')
                    .eq('id', contract.supply_point_id)
                    .single()
                if (sp?.has_bono_social) setHasBonaSocial(true)
            }

        }
        init()
    }, [contract.id, contract.company_id, contract.supply_point_id, destinationSupplier])

    if (!status) return null

    const statusIndex = STEPS.findIndex(s => s.key === status)
    const isRejected = status === 'rejected'
    const isCompleted = status === 'completed'
    const colors = STATUS_COLORS[status] || STATUS_COLORS.requested

    const advanceStatus = async (newStatus: SwitchingStatus) => {
        setUpdating(true)
        try {
            const updateData: Record<string, unknown> = {
                switching_status: newStatus,
            }
            // Set 21-day deadline when moving to in_progress (RD 1011/2009)
            if (newStatus === 'in_progress' && !contract.switching_deadline_at) {
                const deadline = new Date()
                deadline.setDate(deadline.getDate() + SWITCHING_MAX_DAYS)
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
                title: 'Estado actualizado',
                description: newStatus === 'completed'
                    ? 'Traspaso completado. El contrato ha sido activado.'
                    : newStatus === 'rejected'
                        ? 'Traspaso rechazado. El contrato ha sido cancelado.'
                        : `Traspaso marcado como: ${STEPS.find(s => s.key === newStatus)?.label || newStatus}`,
            })
            setShowRejectConfirm(false)
            setShowCompleteConfirm(false)
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
                        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0f172a' }}>
                            Traspaso de Comercializadora
                        </div>
                        <div className="text-xs" style={{ color: '#64748b' }}>
                            {contract.switching_requested_at
                                ? `Iniciado el ${new Date(contract.switching_requested_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                : 'Fecha no registrada'}
                        </div>
                    </div>
                </div>

                <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}
                >
                    {(() => { const Icon = STATUS_ICON[status]; return <Icon size={12} /> })()}
                    {STEPS.find(s => s.key === status)?.label || (isRejected ? 'Rechazado' : status)}
                </div>
            </div>

            {/* Bono Social Warning (RD 897/2017) */}
            {hasBonaSocial && !isCompleted && !isRejected && (
                <div
                    className="mx-5 mt-4 rounded-lg p-3 flex items-start gap-2.5"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" color="#dc2626" />
                    <div className="text-xs" style={{ color: '#991b1b' }}>
                        <span className="font-semibold">Bono Social detectado (RD 897/2017):</span> Este punto de suministro
                        tiene Bono Social activo. El cambio de comercializador puede provocar la perdida del bono.
                        Verifica con el cliente antes de continuar.
                    </div>
                </div>
            )}

            {/* 21-Day Deadline Alert (RD 1011/2009) */}
            {!isCompleted && !isRejected && deadlineAt && (
                <div
                    className="mx-5 mt-4 rounded-lg p-3 flex items-center justify-between"
                    style={{
                        background: isDeadlineExpired ? '#fef2f2' : isDeadlineClose ? '#fffbeb' : '#f0fdf4',
                        border: `1px solid ${isDeadlineExpired ? '#fecaca' : isDeadlineClose ? '#fef08a' : '#bbf7d0'}`,
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Clock
                            size={14}
                            color={isDeadlineExpired ? '#dc2626' : isDeadlineClose ? '#d97706' : '#15803d'}
                        />
                        <div className="text-xs" style={{
                            color: isDeadlineExpired ? '#991b1b' : isDeadlineClose ? '#92400e' : '#14532d'
                        }}>
                            <span className="font-semibold">Plazo legal (RD 1011/2009): </span>
                            {isDeadlineExpired
                                ? `Vencido hace ${Math.abs(daysRemaining!)} dias — el traspaso excede el plazo maximo de ${SWITCHING_MAX_DAYS} dias`
                                : `${daysRemaining} dias restantes de ${SWITCHING_MAX_DAYS} — Limite: ${deadlineAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                            }
                        </div>
                    </div>
                    {isDeadlineExpired && (
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ background: '#dc2626', color: '#fff' }}
                        >
                            VENCIDO
                        </span>
                    )}
                </div>
            )}

            {/* Switching summary: FROM → TO */}
            <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 size={14} className="shrink-0" style={{ color: '#991b1b' }} />
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase" style={{ color: '#991b1b' }}>Desde</div>
                            <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{originSupplier}</div>
                        </div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#2563eb' }} className="shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 size={14} className="shrink-0" style={{ color: '#15803d' }} />
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase" style={{ color: '#15803d' }}>Hacia</div>
                            <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{destinationSupplier}</div>
                            <div className="text-xs truncate" style={{ color: '#64748b' }}>{destinationTariff}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-5 pb-4">
                <div className="flex items-start gap-0">
                    {STEPS.map((step, i) => {
                        const isActive = step.key === status
                        const isPast = statusIndex > i
                        const isFuture = statusIndex < i
                        const StepIcon = STATUS_ICON[step.key]
                        const stepColors = STATUS_COLORS[step.key]

                        return (
                            <div key={step.key} className="flex items-start flex-1 min-w-0">
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

                    {isRejected && (
                        <div className="flex flex-col items-center ml-2" style={{ width: 40 }}>
                            <div
                                className="flex items-center justify-center rounded-full"
                                style={{
                                    width: 36, height: 36,
                                    background: '#fee2e2', border: '2px solid #ef4444',
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

            {/* Switching notes */}
            {contract.switching_notes && (
                <div
                    className="mx-5 mb-4 rounded-lg p-3 text-xs"
                    style={{ background: '#fafbfc', border: '1px dashed #e2e8f0', color: '#64748b' }}
                >
                    <span className="font-semibold" style={{ color: '#475569' }}>Notas:</span> {contract.switching_notes}
                </div>
            )}

            {/* Completed info */}
            {isCompleted && contract.switching_completed_at && (
                <div className="mx-5 mb-4 flex items-center gap-2 text-xs" style={{ color: '#15803d' }}>
                    <CheckCircle2 size={12} />
                    Completado el {new Date(contract.switching_completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            )}

            {/* Manual switching reminder */}
            {!isRejected && !isCompleted && (
                <div
                    className="mx-5 mb-4 rounded-lg p-3 flex items-start gap-2.5"
                    style={{ background: '#fefce8', border: '1px solid #fef08a' }}
                >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" color="#a16207" />
                    <div className="text-xs" style={{ color: '#854d0e' }}>
                        <span className="font-semibold">Traspaso manual:</span> Contacta con {destinationSupplier} y
                        envia la documentacion. Cuando el cambio este confirmado, marca como completado.
                    </div>
                </div>
            )}

            {/* Complete confirmation */}
            {showCompleteConfirm && (
                <div
                    className="mx-5 mb-4 rounded-lg p-4 space-y-3"
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                >
                    <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} color="#15803d" className="shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-semibold" style={{ color: '#14532d' }}>
                                Confirmar traspaso completado
                            </div>
                            <div className="text-xs mt-1" style={{ color: '#166534' }}>
                                El contrato se activara con fecha de hoy.
                                Confirma que el suministro esta activo con {destinationSupplier}.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => setShowCompleteConfirm(false)}
                            className="h-7 px-3 rounded-md text-xs font-medium"
                            style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#fff' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => advanceStatus('completed')}
                            disabled={updating}
                            className="h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5"
                            style={{
                                background: '#15803d',
                                color: '#fff',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                opacity: updating ? 0.7 : 1,
                            }}
                        >
                            {updating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Confirmar Completado
                        </button>
                    </div>
                </div>
            )}

            {/* Reject confirmation */}
            {showRejectConfirm && (
                <div
                    className="mx-5 mb-4 rounded-lg p-4 space-y-3"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                    <div className="flex items-start gap-2">
                        <XCircle size={16} color="#dc2626" className="shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-semibold" style={{ color: '#991b1b' }}>
                                Confirmar rechazo del traspaso
                            </div>
                            <div className="text-xs mt-1" style={{ color: '#b91c1c' }}>
                                El contrato se cancelara. Esta accion no se puede deshacer.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => setShowRejectConfirm(false)}
                            className="h-7 px-3 rounded-md text-xs font-medium"
                            style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#fff' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => advanceStatus('rejected')}
                            disabled={updating}
                            className="h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5"
                            style={{
                                background: '#dc2626',
                                color: '#fff',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                opacity: updating ? 0.7 : 1,
                            }}
                        >
                            {updating ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                            Confirmar Rechazo
                        </button>
                    </div>
                </div>
            )}

            {/* Admin actions */}
            {isAdmin && !isRejected && !isCompleted && !showRejectConfirm && !showCompleteConfirm && (
                <div
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}
                >
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                        Acciones
                    </span>
                    <div className="flex items-center gap-2">
                        {nextStatus() && nextStatus() !== 'completed' && (
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
                        {nextStatus() === 'completed' && (
                            <button
                                onClick={() => setShowCompleteConfirm(true)}
                                disabled={updating}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: '#15803d',
                                    color: '#fff',
                                    cursor: updating ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 1px 4px rgba(21,128,61,0.25)',
                                }}
                            >
                                <CheckCircle2 size={13} />
                                Confirmar Completado
                            </button>
                        )}
                        <button
                            onClick={() => setShowRejectConfirm(true)}
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
