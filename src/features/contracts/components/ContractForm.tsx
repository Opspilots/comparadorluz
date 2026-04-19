import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Customer, TariffVersion, Commissioner, SupplyPoint } from '@/shared/types'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/shared/lib/errors'

export function ContractForm() {
    const navigate = useNavigate()
    const location = useLocation()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { id } = useParams()

    // Data Sources
    const [customers, setCustomers] = useState<Customer[]>([])
    const [tariffs, setTariffs] = useState<TariffVersion[]>([])
    const [commissioners, setCommissioners] = useState<Commissioner[]>([])
    const [supplyPoints, setSupplyPoints] = useState<SupplyPoint[]>([])

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [commercialId, setCommercialId] = useState('')
    const [tariffVersionId, setTariffVersionId] = useState('')
    const [supplyPointId, setSupplyPointId] = useState('')
    const [manualCups, setManualCups] = useState('')
    const [monthlyValue, setMonthlyValue] = useState('')
    const [signedAt, setSignedAt] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [status, setStatus] = useState('signed')

    // Origin tariff (from comparator: client's current tariff)
    const [originSupplierName, setOriginSupplierName] = useState('')
    const [originTariffName, setOriginTariffName] = useState('')
    const [originAnnualCost, setOriginAnnualCost] = useState<number | null>(null)
    const [commissionEur, setCommissionEur] = useState<number | null>(null)

    // Auto-register customer from OCR (when CIF not found)
    const [pendingCustomerName, setPendingCustomerName] = useState('')
    const [pendingCustomerCif, setPendingCustomerCif] = useState('')
    const [showAutoRegister, setShowAutoRegister] = useState(false)
    const [registeringCustomer, setRegisteringCustomer] = useState(false)

    // Regulatory compliance
    const [missingConsent, setMissingConsent] = useState(false)
    const [hasBonaSocial, setHasBonaSocial] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get user's company_id for tenant-scoped queries
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('No autenticado')
                const { data: profile } = await supabase
                    .from('users')
                    .select('company_id')
                    .eq('id', user.id)
                    .maybeSingle()
                if (!profile) throw new Error('Perfil no encontrado')
                const companyId = profile.company_id

                const [custRes, tariffRes, commRes] = await Promise.all([
                    supabase.from('customers').select('*').eq('company_id', companyId).order('name'),
                    supabase.from('tariff_versions').select('*').eq('is_active', true).eq('company_id', companyId),
                    supabase.from('commissioners').select('*').eq('company_id', companyId).eq('is_active', true).order('full_name'),
                ])

                if (custRes.error) throw custRes.error
                if (tariffRes.error) throw tariffRes.error
                if (commRes.error) throw commRes.error

                setCustomers(custRes.data || [])
                setTariffs(tariffRes.data || [])
                setCommissioners(commRes.data || [])

                // Handle Edit Mode or Prefill
                if (id) {
                    const { data: contract, error: contractError } = await supabase
                        .from('contracts')
                        .select('*')
                        .eq('id', id)
                        .eq('company_id', companyId)
                        .single()

                    if (contractError) throw contractError
                    if (contract) {
                        setCustomerId(contract.customer_id)
                        setCommercialId(contract.commercial_id || '')
                        setTariffVersionId(contract.tariff_version_id)
                        setSupplyPointId(contract.supply_point_id || '')
                        const monthly = contract.annual_value_eur ? (contract.annual_value_eur / 12).toFixed(2) : ''
                        setMonthlyValue(monthly)
                        setSignedAt(contract.signed_at || new Date().toISOString().split('T')[0])
                        setNotes(contract.notes || '')
                        setStatus(contract.status || 'signed')
                        if (contract.commission_eur != null) setCommissionEur(contract.commission_eur)
                    }
                } else if (location.state?.prefillData) {
                    const {
                        customerId: prefillCustomerId,
                        customerName: prefillName,
                        customerCif: prefillCif,
                        tariffVersionId: prefillTariff,
                        annualValue,
                        cups,
                        originSupplierName: prefillOriginSupplier,
                        originTariffName: prefillOriginTariff,
                        originAnnualCost: prefillOriginCost,
                        commissionEur: prefillCommission,
                    } = location.state.prefillData

                    if (prefillTariff) setTariffVersionId(prefillTariff)
                    if (annualValue) setMonthlyValue((annualValue / 12).toFixed(2))
                    if (cups) setManualCups(cups)
                    if (prefillOriginSupplier) setOriginSupplierName(prefillOriginSupplier)
                    if (prefillOriginTariff) setOriginTariffName(prefillOriginTariff)
                    if (prefillOriginCost != null) setOriginAnnualCost(prefillOriginCost)
                    if (prefillCommission != null) setCommissionEur(prefillCommission)

                    if (prefillCustomerId) {
                        setCustomerId(prefillCustomerId)
                    } else if (prefillCif && prefillName) {
                        // Customer from OCR not found in DB — offer auto-registration
                        const existingCustomer = (custRes.data || []).find(
                            (c: Customer) => c.cif === prefillCif
                        )
                        if (existingCustomer) {
                            setCustomerId(existingCustomer.id)
                        } else {
                            setPendingCustomerName(prefillName)
                            setPendingCustomerCif(prefillCif)
                            setShowAutoRegister(true)
                        }
                    }
                }

            } catch (err) {
                console.error('Error fetching form data:', err)
                toast({ title: 'Error', description: 'Error al cargar los datos del formulario', variant: 'destructive' })
            } finally {
                setPageLoading(false)
            }
        }
        fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state, id])

    // Load supply points when customer changes
    const manualCupsRef = useRef(manualCups)
    manualCupsRef.current = manualCups

    const loadSupplyPoints = useCallback(async (custId: string) => {
        if (!custId) {
            setSupplyPoints([])
            setSupplyPointId('')
            setMissingConsent(false)
            setHasBonaSocial(false)
            return
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profileData } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
        const companyId = profileData?.company_id
        if (!companyId) return

        const { data, error } = await supabase
            .from('supply_points')
            .select('*')
            .eq('customer_id', custId)
            .eq('company_id', companyId)
            .order('created_at')
        if (!error) {
            setSupplyPoints(data || [])
            if (manualCupsRef.current && data) {
                const match = data.find(sp => sp.cups === manualCupsRef.current)
                if (match) setSupplyPointId(match.id)
            }
            // Check Bono Social (RD 897/2017)
            const bonaSocial = (data || []).some(sp => sp.has_bono_social)
            setHasBonaSocial(bonaSocial)
        }

        // Check consent (RGPD Art.7 + RD 88/2026)
        const { data: consents } = await supabase
            .from('customer_consents')
            .select('consent_type, granted')
            .eq('customer_id', custId)
            .eq('granted', true)
            .is('revoked_at', null)
        const hasDataProcessing = (consents || []).some(c => c.consent_type === 'data_processing')
        setMissingConsent(!hasDataProcessing)
    }, [])

    useEffect(() => {
        if (customerId) loadSupplyPoints(customerId)
    }, [customerId, loadSupplyPoints])

    const handleAutoRegisterCustomer = async () => {
        if (!pendingCustomerCif || !pendingCustomerName) return
        setRegisteringCustomer(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()
            if (!profile) throw new Error('Perfil no encontrado')

            // Check duplicate CIF one more time
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('cif', pendingCustomerCif)
                .eq('company_id', profile.company_id)
                .maybeSingle()

            if (existing) {
                setCustomerId(existing.id)
                setShowAutoRegister(false)
                toast({ title: 'Cliente encontrado', description: `El cliente con CIF ${pendingCustomerCif} ya existe.` })
                return
            }

            const { data: newCustomer, error: insertErr } = await supabase
                .from('customers')
                .insert({
                    company_id: profile.company_id,
                    cif: pendingCustomerCif,
                    name: pendingCustomerName,
                    status: 'prospecto',
                })
                .select('*')
                .single()

            if (insertErr) throw insertErr

            // Add to local list and select
            setCustomers(prev => [...prev, newCustomer as Customer])
            setCustomerId(newCustomer.id)
            setShowAutoRegister(false)

            toast({
                title: 'Cliente registrado',
                description: `${pendingCustomerName} (${pendingCustomerCif}) se ha dado de alta automaticamente.`,
            })
        } catch (err) {
            const e = err as Error
            toast({ title: 'Error al registrar cliente', description: getErrorMessage(e), variant: 'destructive' })
        } finally {
            setRegisteringCustomer(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario no autenticado')

            if (!tariffVersionId) throw new Error('Debes seleccionar una tarifa')
            if (!customerId) throw new Error('Debes seleccionar un cliente')

            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile) throw new Error('Perfil no encontrado')

            const monthlyFloat = parseFloat(monthlyValue)
            if (isNaN(monthlyFloat) || monthlyFloat < 0) {
                throw new Error('El valor mensual no es válido')
            }
            const annualValueEur = monthlyFloat * 12

            // Auto-create supply point if CUPS provided but no supply point selected
            let finalSupplyPointId = supplyPointId || null
            if (!finalSupplyPointId && manualCups && customerId) {
                const { data: existingSp } = await supabase
                    .from('supply_points')
                    .select('id')
                    .eq('customer_id', customerId)
                    .eq('cups', manualCups)
                    .maybeSingle()

                if (existingSp) {
                    finalSupplyPointId = existingSp.id
                } else {
                    const { data: newSp, error: spError } = await supabase
                        .from('supply_points')
                        .insert({
                            company_id: profile.company_id,
                            customer_id: customerId,
                            cups: manualCups,
                            address: customers.find(c => c.id === customerId)?.address || 'Direccion pendiente',
                        })
                        .select('id')
                        .single()

                    if (spError) {
                        throw new Error(`Error al crear punto de suministro (${manualCups}): ${spError.message}`)
                    }
                    finalSupplyPointId = newSp.id
                }
            }

            if (id) {
                // Update existing contract
                const updatePayload: Record<string, unknown> = {
                    customer_id: customerId,
                    tariff_version_id: tariffVersionId,
                    supply_point_id: finalSupplyPointId,
                    signed_at: signedAt,
                    annual_value_eur: annualValueEur,
                    notes: notes,
                    status: status,
                }
                if (commercialId) updatePayload.commercial_id = commercialId
                if (commissionEur !== null) updatePayload.commission_eur = commissionEur

                const { error: updateError } = await supabase
                    .from('contracts')
                    .update(updatePayload)
                    .eq('id', id)
                    .eq('company_id', profile.company_id)

                if (updateError) throw updateError
                toast({ title: 'Contrato actualizado', description: 'El contrato se ha actualizado correctamente.' })
            } else {
                // Create new contract
                const contractNumber = `CTR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

                const insertPayload: Record<string, unknown> = {
                    company_id: profile.company_id,
                    customer_id: customerId,
                    tariff_version_id: tariffVersionId,
                    supply_point_id: finalSupplyPointId,
                    contract_number: contractNumber,
                    status: status,
                    signed_at: signedAt,
                    annual_value_eur: annualValueEur,
                    notes: notes,
                }

                // Only include commercial_id if selected (column is now nullable)
                if (commercialId) insertPayload.commercial_id = commercialId

                // Origin tariff data from comparator
                if (originSupplierName) insertPayload.origin_supplier_name = originSupplierName
                if (originTariffName) insertPayload.origin_tariff_name = originTariffName
                if (originAnnualCost != null) insertPayload.origin_annual_cost_eur = originAnnualCost
                if (commissionEur !== null) insertPayload.commission_eur = commissionEur

                // Update supply point with current supplier info
                if (finalSupplyPointId && originSupplierName) {
                    await supabase
                        .from('supply_points')
                        .update({ current_supplier: originSupplierName })
                        .eq('id', finalSupplyPointId)
                        .then(() => { /* best-effort */ })
                }

                const { data: newContract, error: insertError } = await supabase
                    .from('contracts')
                    .insert(insertPayload)
                    .select('id')
                    .maybeSingle()

                if (insertError) throw insertError
                if (!newContract) throw new Error('No se pudo crear el contrato')

                toast({ title: 'Contrato registrado', description: 'El contrato se ha creado correctamente.' })
            }

            queryClient.invalidateQueries({ queryKey: ['contracts'] })
            queryClient.invalidateQueries({ queryKey: ['customer-detail'] })
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
        <div className="card-padded" style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">{id ? 'Editar Contrato' : 'Nuevo Contrato'}</h1>
                    <p className="page-subtitle">
                        {id ? 'Modifica los datos del contrato existente' : 'Registra un nuevo contrato de energia'}
                    </p>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                    {error}
                </div>
            )}

            {/* Auto-register customer banner (OCR detected, not in DB) */}
            {showAutoRegister && (
                <div style={{
                    padding: '1rem 1.25rem',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
                        Cliente no registrado
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#1e3a5f', marginBottom: '0.75rem' }}>
                        El cliente detectado en la factura no esta dado de alta en el sistema.
                        Puedes registrarlo automaticamente para continuar.
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                        padding: '0.75rem', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe',
                        marginBottom: '0.75rem',
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                Nombre / Razon Social
                            </label>
                            <input
                                type="text"
                                value={pendingCustomerName}
                                onChange={(e) => setPendingCustomerName(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                CIF / NIF
                            </label>
                            <input
                                type="text"
                                value={pendingCustomerCif}
                                onChange={(e) => setPendingCustomerCif(e.target.value.toUpperCase())}
                                style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => setShowAutoRegister(false)}
                            style={{
                                padding: '0.4rem 0.75rem', borderRadius: 6,
                                border: '1px solid #e2e8f0', background: '#fff',
                                fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleAutoRegisterCustomer}
                            disabled={registeringCustomer || !pendingCustomerCif || !pendingCustomerName}
                            style={{
                                padding: '0.4rem 0.75rem', borderRadius: 6,
                                border: 'none', background: '#2563eb',
                                fontSize: '0.8125rem', color: '#fff', fontWeight: 600,
                                cursor: registeringCustomer ? 'not-allowed' : 'pointer',
                                opacity: registeringCustomer ? 0.7 : 1,
                            }}
                        >
                            {registeringCustomer ? 'Registrando...' : 'Registrar y Seleccionar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Origin tariff banner (from comparator) */}
            {originSupplierName && (
                <div className="tour-contract-comparison" style={{
                    padding: '1rem 1.25rem',
                    background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    marginBottom: '0.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px',
                        }}>
                            ⚡
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                            Traspaso desde Comparador
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            flex: 1, padding: '0.625rem 0.75rem', background: '#fff',
                            borderRadius: 8, border: '1px solid #fde68a',
                        }}>
                            <div style={{ fontSize: '0.6875rem', color: '#a16207', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Comercializadora Actual
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#78350f', marginTop: 2 }}>
                                {originSupplierName}
                            </div>
                            {originTariffName && (
                                <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 2 }}>
                                    {originTariffName}
                                </div>
                            )}
                            {originAnnualCost && (
                                <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: 2 }}>
                                    {Math.round(originAnnualCost)} €/año ({Math.round(originAnnualCost / 12)} €/mes)
                                </div>
                            )}
                        </div>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <span style={{ color: '#fff', fontSize: 14 }}>→</span>
                        </div>
                        <div style={{
                            flex: 1, padding: '0.625rem 0.75rem', background: '#fff',
                            borderRadius: 8, border: '1px solid #bfdbfe',
                        }}>
                            <div style={{ fontSize: '0.6875rem', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Nueva Tarifa Propuesta
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e3a5f', marginTop: 2 }}>
                                {tariffs.find(t => t.id === tariffVersionId)?.supplier_name || 'Seleccionar tarifa...'}
                            </div>
                            {tariffs.find(t => t.id === tariffVersionId)?.tariff_name && (
                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                                    {tariffs.find(t => t.id === tariffVersionId)?.tariff_name}
                                </div>
                            )}
                            {monthlyValue && (
                                <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 2 }}>
                                    {Math.round(parseFloat(monthlyValue) * 12)} €/año ({Math.round(parseFloat(monthlyValue))} €/mes)
                                </div>
                            )}
                        </div>
                    </div>
                    {originAnnualCost && monthlyValue && (
                        <div style={{
                            marginTop: '0.75rem', textAlign: 'center',
                            fontSize: '0.8125rem', fontWeight: 600,
                            color: (originAnnualCost - parseFloat(monthlyValue) * 12) > 0 ? '#059669' : '#dc2626',
                        }}>
                            {(originAnnualCost - parseFloat(monthlyValue) * 12) > 0
                                ? `Ahorro estimado: ${Math.round(originAnnualCost - parseFloat(monthlyValue) * 12)} €/año`
                                : `Incremento: ${Math.round(parseFloat(monthlyValue) * 12 - originAnnualCost)} €/año`
                            }
                        </div>
                    )}
                </div>
            )}

            {/* Bono Social Warning (RD 897/2017) */}
            {hasBonaSocial && customerId && (
                <div style={{
                    padding: '0.875rem 1rem', marginBottom: '0.5rem',
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                    display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                }}>
                    <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>⚠️</span>
                    <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991b1b' }}>
                            Bono Social detectado (RD 897/2017)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: 2 }}>
                            Este cliente tiene un punto de suministro con Bono Social activo.
                            Un cambio de comercializador puede provocar la perdida del bono social.
                            Asegurate de informar al cliente antes de proceder.
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Consent Warning (RGPD Art.7) */}
            {missingConsent && customerId && (
                <div style={{
                    padding: '0.875rem 1rem', marginBottom: '0.5rem',
                    background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '10px',
                    display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                }}>
                    <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>🔒</span>
                    <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                            Consentimiento de tratamiento de datos no registrado (RGPD Art. 6)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: 2 }}>
                            No se ha registrado el consentimiento de tratamiento de datos para este cliente.
                            Se enviara automaticamente una solicitud de firma digital antes de generar el contrato.
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="mobile-form-grid" style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Cliente *</label>
                        <select
                            required
                            value={customerId}
                            onChange={(e) => {
                                setCustomerId(e.target.value)
                                setSupplyPointId('')
                            }}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar Cliente...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.cif})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>CUPS</label>
                        <input
                            type="text"
                            value={manualCups}
                            onChange={(e) => {
                                setManualCups(e.target.value)
                                const match = supplyPoints.find(sp => sp.cups === e.target.value)
                                if (match) setSupplyPointId(match.id)
                                else setSupplyPointId('')
                            }}
                            placeholder="ES00..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${manualCups && !supplyPointId ? '#f59e0b' : 'var(--color-border)'}` }}
                        />
                        {manualCups && !supplyPointId && customerId && (
                            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                                CUPS nuevo — se creara automaticamente al guardar
                            </div>
                        )}
                        {supplyPointId && (
                            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                                CUPS existente vinculado
                            </div>
                        )}
                    </div>
                </div>

                {/* Existing supply points selector */}
                {supplyPoints.length > 0 && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-muted)' }}>O seleccionar punto de suministro existente</label>
                        <select
                            value={supplyPointId}
                            onChange={(e) => {
                                setSupplyPointId(e.target.value)
                                const sp = supplyPoints.find(s => s.id === e.target.value)
                                if (sp?.cups) setManualCups(sp.cups)
                            }}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar CUPS existente...</option>
                            {supplyPoints.map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.cups || 'Sin CUPS'} — {sp.address}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Comisionado Asignado</label>
                        <select
                            value={commercialId}
                            onChange={(e) => setCommercialId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
                        >
                            <option value="">Sin comisionado</option>
                            {commissioners.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tarifa Contratada *</label>
                        <select
                            required
                            value={tariffVersionId}
                            onChange={(e) => setTariffVersionId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
                        >
                            <option value="">Seleccionar Tarifa...</option>
                            {tariffs.map(t => (
                                <option key={t.id} value={t.id}>{t.supplier_name || 'Desconocido'} - {t.tariff_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Valor Mensual (€) *</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={monthlyValue}
                            onChange={(e) => setMonthlyValue(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Fecha de Firma</label>
                        <input
                            type="date"
                            required
                            value={signedAt}
                            onChange={(e) => setSignedAt(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                    <div className="tour-contract-status">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Estado</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--surface)' }}
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
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '100px' }}
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
