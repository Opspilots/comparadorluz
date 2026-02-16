import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Customer, TariffVersion, Commissioner } from '@/shared/types'
import { useToast } from '@/hooks/use-toast'

export function ContractForm() {
    const navigate = useNavigate()
    const location = useLocation()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { id } = useParams()

    // Data Sources
    const [customers, setCustomers] = useState<Customer[]>([])
    const [tariffs, setTariffs] = useState<TariffVersion[]>([])
    const [commissioners, setCommissioners] = useState<Commissioner[]>([])

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [commercialId, setCommercialId] = useState('')
    const [tariffVersionId, setTariffVersionId] = useState('')
    const [annualValue, setAnnualValue] = useState('')
    const [signedAt, setSignedAt] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [status, setStatus] = useState('signed')

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Customers
                const { data: custData, error: custError } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name')

                if (custError) throw custError

                // Fetch Active Tariffs
                const { data: tariffData, error: tariffError } = await supabase
                    .from('tariff_versions')
                    .select('*')
                    .eq('is_active', true)

                if (tariffError) throw tariffError

                // Fetch Active Commissioners
                const { data: commData, error: commError } = await supabase
                    .from('commissioners')
                    .select('*')
                    .eq('is_active', true)
                    .order('full_name')

                if (commError) throw commError

                setCustomers(custData || [])
                setTariffs(tariffData || [])
                setCommissioners(commData || [])

                // Handle Edit Mode or Prefill
                if (id) {
                    const { data: contract, error: contractError } = await supabase
                        .from('contracts')
                        .select('*')
                        .eq('id', id)
                        .single()

                    if (contractError) throw contractError
                    if (contract) {
                        setCustomerId(contract.customer_id)
                        setCommercialId(contract.commercial_id || '')
                        setTariffVersionId(contract.tariff_version_id)
                        setAnnualValue(contract.annual_value_eur?.toString() || '')
                        setSignedAt(contract.signed_at || new Date().toISOString().split('T')[0])
                        setNotes(contract.notes || '')
                        setStatus(contract.status || 'signed')
                    }
                } else if (location.state?.prefillData) {
                    const { customerId, tariffVersionId, annualValue } = location.state.prefillData
                    if (customerId) setCustomerId(customerId)
                    if (tariffVersionId) setTariffVersionId(tariffVersionId)
                    if (annualValue) setAnnualValue(annualValue.toString())
                }

            } catch (err) {
                console.error('Error fetching form data:', err)
            } finally {
                setPageLoading(false)
            }
        }
        fetchData()
    }, [location.state]) // Depend on location.state

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario no autenticado')

            // Get Company ID from user profile
            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile) throw new Error('Perfil no encontrado')

            if (id) {
                // Update existing contract
                const { error: updateError } = await supabase
                    .from('contracts')
                    .update({
                        customer_id: customerId,
                        commercial_id: commercialId || null,
                        tariff_version_id: tariffVersionId,
                        signed_at: signedAt,
                        annual_value_eur: parseFloat(annualValue),
                        notes: notes,
                        status: status,
                    })
                    .eq('id', id)

                if (updateError) throw updateError
                toast({ title: 'Contrato actualizado', description: 'El contrato se ha actualizado correctamente.' })
            } else {
                // Create new contract
                // Generate Contract Number (Random for now)
                const contractNumber = `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

                const { error: insertError } = await supabase
                    .from('contracts')
                    .insert({
                        company_id: profile.company_id,
                        customer_id: customerId,
                        commercial_id: commercialId || null,
                        tariff_version_id: tariffVersionId,
                        contract_number: contractNumber,
                        status: status, // Use selected status
                        signed_at: signedAt,
                        annual_value_eur: parseFloat(annualValue),
                        notes: notes,
                    })

                if (insertError) throw insertError
                toast({ title: 'Contrato registrado', description: 'El contrato se ha creado correctamente.' })
            }

            navigate('/contracts')
        } catch (err) {
            const error = err as Error;
            console.error('Error saving contract:', error)
            setError(error.message || 'Error al guardar el contrato')
        } finally {
            setLoading(false)
        }
    }

    if (pageLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Cargando formulario...</div>

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', background: 'var(--surface)', border: '1px solid var(--border)' }}>


            {error && (
                <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Cliente *</label>
                        <select
                            required
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar Cliente...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.cif})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Comisionado Asignado</label>
                        <select
                            // required - Removed
                            value={commercialId}
                            onChange={(e) => setCommercialId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar Comisionado...</option>
                            {commissioners.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tarifa Contratada *</label>
                        <select
                            required
                            value={tariffVersionId}
                            onChange={(e) => setTariffVersionId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar Tarifa...</option>
                            {tariffs.map(t => (
                                <option key={t.id} value={t.id}>{t.supplier_name || 'Desconocido'} - {t.tariff_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Valor Anual (€) *</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={annualValue}
                            onChange={(e) => setAnnualValue(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Fecha de Firma</label>
                        <input
                            type="date"
                            required
                            value={signedAt}
                            onChange={(e) => setSignedAt(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estado</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                            <option value="pending">Pendiente</option>
                            <option value="signed">Firmado</option>
                            <option value="active">Activo</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="completed">Completado</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notas</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Detalles adicionales..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: '100px' }}
                    />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.875rem', fontSize: '1rem' }}
                    >
                        {loading ? 'Guardando...' : (id ? 'Actualizar Contrato' : 'Registrar Contrato')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/contracts')}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.875rem', fontSize: '1rem' }}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
