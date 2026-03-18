import { useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface CreateCommissionerPayload {
    email: string;
    fullName: string;
    phone: string;
    nif: string;
    address: string;
    commissionPct: string;
}

export function useCreateCommissioner() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const createCommissioner = async (payload: CreateCommissionerPayload) => {
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            // 1. Check if commissioner already exists by email
            if (payload.email) {
                const { data: existing } = await supabase
                    .from('commissioners')
                    .select('id')
                    .eq('email', payload.email)
                    .single()

                if (existing) {
                    setError('Ya existe un comisionado con este correo electrónico.')
                    setLoading(false)
                    return false
                }
            }

            // 2. Get company_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!userData?.company_id) throw new Error('Error al obtener info de empresa')

            // 3. Insert new commissioner
            const pct = payload.commissionPct ? parseFloat(payload.commissionPct) : 0
            const { error: createError } = await supabase
                .from('commissioners')
                .insert({
                    company_id: userData.company_id,
                    full_name: payload.fullName,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    nif: payload.nif || null,
                    address: payload.address || null,
                    is_active: true,
                    commission_default_pct: pct
                })

            if (createError) throw createError

            setSuccess(true)
            return true;

        } catch (err: unknown) {
            console.error('Error creating commissioner:', err)
            setError(err instanceof Error ? err.message : 'Error al crear comisionado')
            return false;
        } finally {
            setLoading(false)
        }
    }

    const resetStates = useCallback(() => {
        setError(null)
        setSuccess(false)
    }, [])

    return { createCommissioner, loading, error, success, resetStates }
}
