import React, { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export function SupplyPointForm() {
    const { customerId } = useParams<{ customerId: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    const [cups, setCups] = useState('')
    const [address, setAddress] = useState('')
    const [postalCode, setPostalCode] = useState('')
    const [province, setProvince] = useState('')
    const [tariffType, setTariffType] = useState('2.0TD')
    const [contractedPower, setContractedPower] = useState('')
    const [annualConsumption, setAnnualConsumption] = useState('')

    useEffect(() => {
        if (!customerId) navigate('/crm')
    }, [customerId, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            // Fetch correct company_id
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (profileError || !profile) throw new Error('Error al verificar permisos de empresa.')
            const companyId = profile.company_id

            const { error: insertError } = await supabase
                .from('supply_points')
                .insert({
                    company_id: companyId,
                    customer_id: customerId,
                    cups: cups?.toUpperCase(),
                    address,
                    postal_code: postalCode,
                    province,
                    tariff_type: tariffType,
                    contracted_power_kw: contractedPower ? parseFloat(contractedPower) : undefined,
                    annual_consumption_kwh: annualConsumption ? parseFloat(annualConsumption) : undefined,
                })

            if (insertError) throw insertError

            navigate(`/crm/${customerId}`)
        } catch (err: unknown) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error al guardar punto de suministro', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>


            {error && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', marginBottom: '1.5rem', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>CUPS (Código Universal)</label>
                    <input
                        type="text"
                        value={cups}
                        onChange={(e) => setCups(e.target.value)}
                        placeholder="ES0021..."
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Dirección del Suministro</label>
                    <textarea
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Código Postal</label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Provincia</label>
                        <input
                            type="text"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Tarifa Acceso</label>
                        <select
                            value={tariffType}
                            onChange={(e) => setTariffType(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        >
                            <option value="2.0TD">2.0TD</option>
                            <option value="3.0TD">3.0TD</option>
                            <option value="6.1TD">6.1TD</option>
                            <option value="6.2">6.2</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Potencia (kW)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={contractedPower}
                            onChange={(e) => setContractedPower(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Consumo Anual Estimado (kWh)</label>
                    <input
                        type="number"
                        value={annualConsumption}
                        onChange={(e) => setAnnualConsumption(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.8rem' }}
                    >
                        {loading ? 'Guardando...' : 'Guardar Suministro'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/crm/${customerId}`)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.8rem' }}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
