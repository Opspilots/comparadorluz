import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Contract, TariffVersion } from '@/shared/types'
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
    Zap,
    Building2,
    MapPin,
    ChevronRight,
    Loader2,
    CalendarDays,
    FileText,
} from 'lucide-react'

interface SwitchingDialogProps {
    contract: Contract
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function SwitchingDialog({ contract, open, onOpenChange, onSuccess }: SwitchingDialogProps) {
    const { toast } = useToast()
    const [tariffs, setTariffs] = useState<TariffVersion[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [tariffVersionId, setTariffVersionId] = useState('')
    const [estimatedDate, setEstimatedDate] = useState('')
    const [switchingNotes, setSwitchingNotes] = useState('')

    // Derived
    const selectedTariff = tariffs.find(t => t.id === tariffVersionId)
    const currentSupplier = contract.tariff_versions?.suppliers?.name || contract.tariff_versions?.supplier_name || 'Desconocida'
    const currentTariff = contract.tariff_versions?.tariff_name || 'Desconocida'
    const customerName = contract.customers?.name || 'Cliente'
    const cups = contract.supply_points?.cups || '—'

    useEffect(() => {
        if (!open) return
        setLoading(true)
        supabase
            .from('tariff_versions')
            .select('*')
            .eq('is_active', true)
            .order('supplier_name')
            .then(({ data }) => {
                // Exclude tariffs from the same supplier to make switching meaningful
                setTariffs(data || [])
                setLoading(false)
            })
    }, [open])

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setTariffVersionId('')
            setEstimatedDate('')
            setSwitchingNotes('')
        }
    }, [open])

    const handleSubmit = async () => {
        if (!tariffVersionId) return
        setSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()
            if (!profile) throw new Error('Perfil no encontrado')

            const contractNumber = `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

            // 1. Create new contract linked to the original
            const { error: insertErr } = await supabase
                .from('contracts')
                .insert({
                    company_id: profile.company_id,
                    customer_id: contract.customer_id,
                    supply_point_id: contract.supply_point_id || null,
                    commercial_id: contract.commercial_id || null,
                    tariff_version_id: tariffVersionId,
                    contract_number: contractNumber,
                    status: 'pending',
                    annual_value_eur: contract.annual_value_eur,
                    switching_from_contract_id: contract.id,
                    switching_notes: switchingNotes || null,
                    estimated_activation_date: estimatedDate || null,
                    notes: `Traspaso desde ${currentSupplier} (${contract.contract_number || 'sin ref'})`,
                })

            if (insertErr) throw insertErr

            // 2. Update original contract switching status
            const { error: updateErr } = await supabase
                .from('contracts')
                .update({
                    switching_status: 'requested',
                    switching_requested_at: new Date().toISOString(),
                })
                .eq('id', contract.id)

            if (updateErr) throw updateErr

            // 3. Best-effort: trigger integration switching
            supabase.functions
                .invoke('integration-sync', {
                    body: {
                        action: 'request_switching',
                        contractId: contract.id,
                        companyId: profile.company_id,
                    },
                })
                .catch(() => { /* non-critical */ })

            toast({
                title: 'Traspaso iniciado',
                description: `Se ha solicitado el cambio a ${selectedTariff?.supplier_name || 'nueva comercializadora'}`,
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
            <DialogContent className="max-w-[580px] p-0 overflow-hidden">
                {/* Header with gradient accent */}
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

                <div className="px-6 py-5 space-y-5">
                    {/* Current contract summary */}
                    <div
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                            <Zap size={12} />
                            Contrato Actual
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                                <Building2 size={14} className="mt-0.5 shrink-0" style={{ color: '#64748b' }} />
                                <div>
                                    <div className="text-xs" style={{ color: '#94a3b8' }}>Comercializadora</div>
                                    <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{currentSupplier}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <FileText size={14} className="mt-0.5 shrink-0" style={{ color: '#64748b' }} />
                                <div>
                                    <div className="text-xs" style={{ color: '#94a3b8' }}>Tarifa</div>
                                    <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{currentTariff}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 col-span-2">
                                <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: '#64748b' }} />
                                <div>
                                    <div className="text-xs" style={{ color: '#94a3b8' }}>CUPS</div>
                                    <div className="text-sm font-mono font-medium" style={{ color: '#0f172a' }}>{cups}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrow transition */}
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

                    {/* New tariff selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#2563eb' }}>
                            <Zap size={12} />
                            Nueva Comercializadora
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                                Tarifa Destino *
                            </label>
                            {loading ? (
                                <div className="flex items-center gap-2 p-3 text-sm" style={{ color: '#94a3b8' }}>
                                    <Loader2 size={14} className="animate-spin" /> Cargando tarifas...
                                </div>
                            ) : (
                                <select
                                    required
                                    value={tariffVersionId}
                                    onChange={(e) => setTariffVersionId(e.target.value)}
                                    className="w-full h-9 rounded-lg border px-3 text-sm"
                                    style={{ borderColor: '#e2e8f0', background: '#fff' }}
                                >
                                    <option value="">Seleccionar tarifa destino...</option>
                                    {tariffs.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.supplier_name} — {t.tariff_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedTariff && (
                            <div
                                className="rounded-lg p-3 flex items-center gap-3"
                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                            >
                                <Building2 size={16} style={{ color: '#15803d' }} />
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: '#15803d' }}>
                                        {selectedTariff.supplier_name}
                                    </div>
                                    <div className="text-xs" style={{ color: '#16a34a' }}>
                                        {selectedTariff.tariff_name} — {selectedTariff.tariff_type}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                                    <CalendarDays size={13} />
                                    Fecha Estimada Activacion
                                </label>
                                <input
                                    type="date"
                                    value={estimatedDate}
                                    onChange={(e) => setEstimatedDate(e.target.value)}
                                    className="w-full h-9 rounded-lg border px-3 text-sm"
                                    style={{ borderColor: '#e2e8f0' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                                Notas del Traspaso
                            </label>
                            <textarea
                                value={switchingNotes}
                                onChange={(e) => setSwitchingNotes(e.target.value)}
                                placeholder="Motivo del cambio, observaciones..."
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                                style={{ borderColor: '#e2e8f0' }}
                            />
                        </div>
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
                        disabled={!tariffVersionId || submitting}
                        className="h-9 px-5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                        style={{
                            background: tariffVersionId ? '#2563eb' : '#94a3b8',
                            color: '#fff',
                            opacity: submitting ? 0.7 : 1,
                            cursor: !tariffVersionId || submitting ? 'not-allowed' : 'pointer',
                            boxShadow: tariffVersionId ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                        }}
                    >
                        {submitting ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <ArrowRightLeft size={15} />
                        )}
                        {submitting ? 'Procesando...' : 'Confirmar Traspaso'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
