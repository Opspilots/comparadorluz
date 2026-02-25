
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CreateRuleDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    presetCommissionerId?: string
}

export function CreateRuleDialog({ isOpen, onClose, onSuccess, presetCommissionerId }: CreateRuleDialogProps) {
    const [commissioners, setCommissioners] = useState<{ id: string; full_name: string }[]>([])
    const [suppliers, setSuppliers] = useState<{ name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [commissionerId, setCommissionerId] = useState('')
    const [supplierName, setSupplierName] = useState('')
    const [tariffType, setTariffType] = useState('')
    const [percentage, setPercentage] = useState('')
    const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0])
    const { toast } = useToast()

    useEffect(() => {
        const fetchFormData = async () => {
            setLoading(true)
            setError(null) // Clear previous errors

            try {
                // 1. Get current user's company_id
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: userProfile, error: userProfileError } = await supabase
                        .from('users')
                        .select('company_id')
                        .eq('id', user.id)
                        .single()

                    if (userProfileError) {
                        throw userProfileError
                    }

                    if (userProfile) setCompanyId(userProfile.company_id)
                }

                // 2. Fetch Commissioners
                const { data: commissionersData, error: commissionersError } = await supabase
                    .from('commissioners')
                    .select('id, full_name')
                    .eq('is_active', true)
                    .order('full_name')

                if (commissionersError) {
                    throw commissionersError
                }
                if (commissionersData) setCommissioners(commissionersData as { id: string; full_name: string }[])

                // 3. Fetch Suppliers
                const { data: suppliersData, error: suppliersError } = await supabase
                    .from('suppliers')
                    .select('name')
                    .eq('is_active', true)
                    .order('name')

                if (suppliersError) {
                    throw suppliersError
                }
                if (suppliersData) setSuppliers(suppliersData)

            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al cargar datos del formulario')
                toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al cargar datos del formulario', variant: 'destructive' })
            } finally {
                setLoading(false)
            }
        }

        if (isOpen) {
            fetchFormData()
            if (presetCommissionerId) {
                setCommissionerId(presetCommissionerId)
            }
            // Reset error when dialog opens
            setError(null)
        }
    }, [isOpen, presetCommissionerId, toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyId || !commissionerId || !percentage) {
            setError('Todos los campos obligatorios deben ser rellenados.')
            return
        }

        setLoading(true)
        setError(null) // Clear previous errors

        try {
            const { error: insertError } = await supabase
                .from('commission_rules')
                .insert({
                    company_id: companyId,
                    commissioner_id: commissionerId,
                    supplier_name: supplierName || null,
                    tariff_type: tariffType || null,
                    commission_pct: parseFloat(percentage),
                    valid_from: validFrom,
                    is_active: true
                })

            if (insertError) {
                throw insertError
            }

            onSuccess()
            onClose()
            // Reset form
            setCommissionerId('')
            setSupplierName('')
            setTariffType('')
            setPercentage('')
            setValidFrom(new Date().toISOString().split('T')[0]) // Reset validFrom as well
            toast({ title: 'Éxito', description: 'Regla de comisión creada correctamente.', variant: 'default' })

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al crear la regla')
            toast({ title: 'Error', description: 'Error al crear la regla: ' + (err instanceof Error ? err.message : 'Error desconocido'), variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Nueva Regla de Comisión</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
                    {/* Commissioner */}
                    {!presetCommissionerId && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                Comisionado *
                            </label>
                            <select
                                required
                                value={commissionerId}
                                onChange={e => setCommissionerId(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                disabled={loading}
                            >
                                <option value="">Seleccionar comisionado...</option>
                                {commissioners.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Supplier */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Comercializadora (Opcional)
                        </label>
                        <select
                            value={supplierName}
                            onChange={e => setSupplierName(e.target.value)}
                            style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        >
                            <option value="">Todas (Regla por defecto)</option>
                            {suppliers.map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Si se deja vacío, aplicará a todas.
                        </p>
                    </div>

                    {/* Tariff Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Tipo de Tarifa (Opcional)
                        </label>
                        <select
                            value={tariffType}
                            onChange={e => setTariffType(e.target.value)}
                            style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        >
                            <option value="">Todas</option>
                            <option value="2.0TD">2.0TD</option>
                            <option value="3.0TD">3.0TD</option>
                            <option value="6.1TD">6.1TD</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Percentage */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                Porcentaje % *
                            </label>
                            <input
                                type="number"
                                required
                                min="0" max="100" step="0.01"
                                value={percentage}
                                onChange={e => setPercentage(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                placeholder="Ej: 10.5"
                            />
                        </div>

                        {/* Valid From */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                Válido desde *
                            </label>
                            <input
                                type="date"
                                required
                                value={validFrom}
                                onChange={e => setValidFrom(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Guardando...' : 'Crear Regla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
