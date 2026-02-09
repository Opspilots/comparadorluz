import { useState, useEffect } from 'react'

export interface ComparatorState {
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

const STORAGE_KEY = 'comparator_form_state'
const AUTO_SAVE_DELAY = 500 // ms

const defaultState: ComparatorState = {
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
    const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                setState({ ...defaultState, ...parsed }) // Merge with defaultState to ensure all keys exist
                setIsRestored(true)
            }
        } catch (error) {
            console.error('Error loading saved state:', error)
        }
    }, [])

    // Auto-save to localStorage when state changes (debounced)
    useEffect(() => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout)
        }

        const timeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
            } catch (error) {
                console.error('Error saving state:', error)
            }
        }, AUTO_SAVE_DELAY)

        setAutoSaveTimeout(timeout)

        return () => {
            if (timeout) clearTimeout(timeout)
        }
    }, [state])

    const updateState = (updates: Partial<ComparatorState>) => {
        setState(prev => ({ ...prev, ...updates }))
    }

    const clearState = () => {
        setState(defaultState)
        localStorage.removeItem(STORAGE_KEY)
        setIsRestored(false)
    }

    return {
        state,
        updateState,
        clearState,
        isRestored,
    }
}
