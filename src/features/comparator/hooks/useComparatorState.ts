import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface ComparatorState {
    // Supply Type
    supplyType: 'electricity' | 'gas'

    // Selection
    selectedCustomer: string
    selectedSP: string
    customerName: string
    cif: string

    // Basic inputs
    consumption: string
    power: string
    tariffType: string
    mode: 'client_first' | 'commercial_first'

    // Advanced inputs
    reactiveEnergy: string
    maxDemand: string
    conversionFactor: string // For Gas
    currentCost: string

    // Invoice metadata
    cups: string
    currentSupplier: string

    // Power by period
    powerP1: string
    powerP2: string
    powerP3: string
    powerP4: string
    powerP5: string
    powerP6: string

    // Consumption % by period
    consP1: string
    consP2: string
    consP3: string
    consP4: string
    consP5: string
    consP6: string
}

const STORAGE_KEY_PREFIX = 'comparator_form_state_'
const AUTO_SAVE_DELAY = 500 // ms

const defaultState: ComparatorState = {
    supplyType: 'electricity',
    selectedCustomer: '',
    selectedSP: '',
    customerName: '',
    cif: '',
    consumption: '',
    power: '',
    tariffType: '2.0TD',
    mode: 'client_first',
    reactiveEnergy: '',
    maxDemand: '',
    conversionFactor: '',
    currentCost: '',
    cups: '',
    currentSupplier: '',
    powerP1: '',
    powerP2: '',
    powerP3: '',
    powerP4: '',
    powerP5: '',
    powerP6: '',
    consP1: '',
    consP2: '',
    consP3: '',
    consP4: '',
    consP5: '',
    consP6: '',
}

export function useComparatorState() {
    const [state, setState] = useState<ComparatorState>(defaultState)
    const [isRestored, setIsRestored] = useState(false)
    const [storageKey, setStorageKey] = useState<string | null>(null)

    // Get current user ID to scope localStorage key
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                const key = `${STORAGE_KEY_PREFIX}${user.id}`
                setStorageKey(key)
                // Load saved state for this user
                try {
                    const saved = localStorage.getItem(key)
                    if (saved) {
                        const parsed = JSON.parse(saved)
                        setState({ ...defaultState, ...parsed })
                        setIsRestored(true)
                    }
                } catch (error) {
                    console.error('Error loading saved state:', error)
                }
            }
        })
    }, [])

    // Auto-save to localStorage when state changes (debounced)
    // Exclude tenant-specific IDs to prevent cross-company data leaks
    useEffect(() => {
        if (!storageKey) return

        const timeout = setTimeout(() => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { selectedCustomer, selectedSP, cif, cups, ...persistableState } = state
                localStorage.setItem(storageKey, JSON.stringify(persistableState))
            } catch (error) {
                console.error('Error saving state:', error)
            }
        }, AUTO_SAVE_DELAY)

        return () => {
            clearTimeout(timeout)
        }
    }, [state, storageKey])

    const updateState = useCallback((updates: Partial<ComparatorState>) => {
        setState(prev => ({ ...prev, ...updates }))
    }, [])

    const clearState = useCallback(() => {
        setState(defaultState)
        if (storageKey) localStorage.removeItem(storageKey)
        setIsRestored(false)
    }, [storageKey])

    return {
        state,
        updateState,
        clearState,
        isRestored,
    }
}
