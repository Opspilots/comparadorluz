import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Contract } from '@/shared/types'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/dialog'
import {
    ArrowRightLeft,
    Building2,
    MapPin,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react'

interface SwitchingDialogProps {
    contract: Contract
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function SwitchingDialog({ contract, open, onOpenChange, onSuccess }: SwitchingDialogProps) {
    const { toast } = useToast()
    const [submitting, setSubmitting] = useState(false)
    const [switchingNotes, setSwitchingNotes] = useState('')

    // Manual confirmation step
    const [showConfirmation, setShowConfirmation] = useState(false)

    // Derived — the contract's tariff IS the destination
    const destinationSupplier = contract.tariff_versions?.suppliers?.name || contract.tariff_versions?.supplier_name || 'Desconocida'
    const destinationTariff = contract.tariff_versions?.tariff_name || 'Desconocida'
    // Origin: where the client is NOW
    const originSupplier = contract.origin_supplier_name
        || contract.supply_points?.current_supplier
        || 'No especificada'
    const originTariff = contract.origin_tariff_name
        || contract.supply_points?.current_tariff_name
        || ''
    const customerName = contract.customers?.name || 'Cliente'
    const cups = contract.supply_points?.cups || '—'

    // Reset on close
    useEffect(() => {
        if (!open) {
            setSwitchingNotes('')
            setShowConfirmation(false)
        }
    }, [open])

    const handleSubmit = async () => {
        // Always require confirmation step for manual switching
        if (!showConfirmation) {
            setShowConfirmation(true)
            return
        }

        setSubmitting(true)

        try {
            // Verify caller has admin/manager role before initiating switching
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: profile } = await supabase
                .from('users')
                .select('role, company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (profile?.role !== 'admin' && profile?.role !== 'manager') {
                throw new Error('Solo administradores y managers pueden iniciar traspasos')
            }
            if (!profile?.company_id) throw new Error('Perfil de empresa no encontrado')

            // Update this contract's switching status
            const { error: updateErr } = await supabase
                .from('contracts')
                .update({
                    switching_status: 'requested',
                    switching_requested_at: new Date().toISOString(),
                    switching_notes: switchingNotes || null,
                })
                .eq('id', contract.id)
                .eq('company_id', profile.company_id)

            if (updateErr) throw updateErr

            toast({
                title: 'Traspaso iniciado',
                description: `Cambio a ${destinationSupplier} registrado. Confirma cada paso manualmente.`,
            })

            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            const e = err as Error
            toast({
                title: 'Error al iniciar traspaso',
                description: e.message,
                variant: 'destructive',
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[520px] p-0 overflow-hidden">
                {/* Header */}
                <div
                    className="px-6 pt-6 pb-4"
                    style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #f5f3ff 100%)',
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div
                                className="flex items-center justify-center w-9 h-9 rounded-xl"
                                style={{ background: '#2563eb', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
                            >
                                <ArrowRightLeft size={18} color="#fff" />
                            </div>
                            <div>
                                <DialogTitle className="text-[1.125rem]">Iniciar Traspaso</DialogTitle>
                                <DialogDescription className="mt-0.5">
                                    Cambio de comercializadora para {customerName}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Confirmation for manual switching */}
                {showConfirmation ? (
                    <div className="px-6 py-6 space-y-5">
                        <div
                            className="rounded-xl p-5 space-y-4"
                            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                                    style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
                                >
                                    <AlertTriangle size={20} color="#d97706" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: '#92400e' }}>
                                        Traspaso Manual Requerido
                                    </div>
                                    <div className="text-sm mt-1" style={{ color: '#78350f' }}>
                                        <strong>{destinationSupplier}</strong> no tiene integracion API activa.
                                        Deberas gestionar el traspaso manualmente.
                                    </div>
                                </div>
                            </div>

                            <div
                                className="rounded-lg p-3.5 space-y-2"
                                style={{ background: '#fff', border: '1px solid #fde68a' }}
                            >
                                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#92400e' }}>
                                    Pasos a seguir:
                                </div>
                                <ul className="space-y-1.5">
                                    {[
                                        'Contactar con la comercializadora destino',
                                        'Enviar documentacion del cliente (CIF, CUPS, autorizacion)',
                                        'Confirmar recepcion de la solicitud ATR',
                                        'Marcar como completado cuando se active el suministro',
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#78350f' }}>
                                            <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5"
                                                style={{ background: '#fde68a', color: '#92400e' }}>
                                                {i + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowConfirmation(false)}
                                className="h-9 px-4 rounded-lg text-sm font-medium"
                                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#fff' }}
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="h-9 px-5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                                style={{
                                    background: '#d97706',
                                    color: '#fff',
                                    opacity: submitting ? 0.7 : 1,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
                                }}
                            >
                                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                {submitting ? 'Procesando...' : 'Confirmar Traspaso Manual'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-5 space-y-5">
                            {/* Switching summary: FROM → TO */}
                            <div className="space-y-3">
                                {/* Origin (current) */}
                                <div
                                    className="rounded-xl p-3.5"
                                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                                >
                                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#991b1b' }}>
                                        <Building2 size={11} />
                                        Comercializadora Actual
                                    </div>
                                    <div className="text-sm font-semibold" style={{ color: '#7f1d1d' }}>
                                        {originSupplier}
                                    </div>
                                    {originTariff && (
                                        <div className="text-xs mt-0.5" style={{ color: '#991b1b' }}>{originTariff}</div>
                                    )}
                                    {contract.origin_annual_cost_eur && (
                                        <div className="text-xs mt-1" style={{ color: '#b91c1c' }}>
                                            {Math.round(contract.origin_annual_cost_eur)} €/año
                                        </div>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="flex justify-center">
                                    <div
                                        className="flex items-center justify-center w-8 h-8 rounded-full"
                                        style={{
                                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                                        }}
                                    >
                                        <ChevronRight size={16} color="#fff" style={{ transform: 'rotate(90deg)' }} />
                                    </div>
                                </div>

                                {/* Destination (contract's tariff) */}
                                <div
                                    className="rounded-xl p-3.5"
                                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                                >
                                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#15803d' }}>
                                        <Building2 size={11} />
                                        Nueva Comercializadora
                                    </div>
                                    <div className="text-sm font-semibold" style={{ color: '#14532d' }}>
                                        {destinationSupplier}
                                    </div>
                                    <div className="text-xs mt-0.5" style={{ color: '#166534' }}>{destinationTariff}</div>
                                    <div className="text-xs mt-1" style={{ color: '#15803d' }}>
                                        {Math.round(contract.annual_value_eur)} €/año
                                    </div>
                                </div>

                                {/* Savings */}
                                {contract.origin_annual_cost_eur && (
                                    <div className="text-center">
                                        <span
                                            className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                                            style={{
                                                background: (contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#ecfdf5' : '#fef2f2',
                                                color: (contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#059669' : '#dc2626',
                                                border: `1px solid ${(contract.origin_annual_cost_eur - contract.annual_value_eur) > 0 ? '#a7f3d0' : '#fecaca'}`,
                                            }}
                                        >
                                            {(contract.origin_annual_cost_eur - contract.annual_value_eur) > 0
                                                ? `Ahorro: ${Math.round(contract.origin_annual_cost_eur - contract.annual_value_eur)} €/año`
                                                : `Incremento: ${Math.round(contract.annual_value_eur - contract.origin_annual_cost_eur)} €/año`
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* CUPS */}
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                                <MapPin size={12} />
                                <span className="font-medium">CUPS:</span>
                                <span className="font-mono">{cups}</span>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                                    Notas del Traspaso
                                </label>
                                <textarea
                                    value={switchingNotes}
                                    onChange={(e) => setSwitchingNotes(e.target.value)}
                                    placeholder="Motivo del cambio, observaciones..."
                                    rows={2}
                                    className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                                    style={{ borderColor: '#e2e8f0' }}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="px-6 py-4 flex items-center justify-between gap-3"
                            style={{ borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}
                        >
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="h-9 px-4 rounded-lg text-sm font-medium"
                                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#fff' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="h-9 px-5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                                style={{
                                    background: '#2563eb',
                                    color: '#fff',
                                    opacity: submitting ? 0.7 : 1,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                }}
                            >
                                {submitting ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <ArrowRightLeft size={15} />
                                )}
                                {submitting ? 'Procesando...' : 'Iniciar Traspaso'}
                            </button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
