import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { ContractTemplate } from '@/shared/types'
import { DEFAULT_CONTRACT_TEMPLATE } from '../components/ContractDocument'

type TemplateFields = Omit<ContractTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>

export function useContractTemplate() {
    const [template, setTemplate] = useState<ContractTemplate | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTemplate = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from('contract_templates')
                .select('*')
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (data) {
                setTemplate(data)
            } else {
                // No template yet — use defaults as a local draft
                setTemplate({
                    id: '',
                    company_id: '',
                    ...DEFAULT_CONTRACT_TEMPLATE,
                    created_at: '',
                    updated_at: '',
                } as ContractTemplate)
            }
        } catch (err) {
            const e = err as Error
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTemplate()
    }, [fetchTemplate])

    const saveTemplate = useCallback(async (fields: TemplateFields): Promise<boolean> => {
        setSaving(true)
        setError(null)
        try {
            const { data: existing } = await supabase
                .from('contract_templates')
                .select('id')
                .single()

            if (existing?.id) {
                const { error } = await supabase
                    .from('contract_templates')
                    .update(fields)
                    .eq('id', existing.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('contract_templates')
                    .insert(fields)
                if (error) throw error
            }

            await fetchTemplate()
            return true
        } catch (err) {
            const e = err as Error
            setError(e.message)
            return false
        } finally {
            setSaving(false)
        }
    }, [fetchTemplate])

    const resetToDefaults = useCallback(() => {
        setTemplate(prev => prev ? { ...prev, ...DEFAULT_CONTRACT_TEMPLATE } : null)
    }, [])

    return { template, loading, saving, error, saveTemplate, resetToDefaults }
}
