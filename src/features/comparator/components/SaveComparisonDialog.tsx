import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { X } from 'lucide-react'
import type { ComparisonResult } from '@/shared/types'

interface SaveComparisonDialogProps {
    isOpen: boolean
    onClose: () => void
    comparisonData: {
        consumption_p1: number
        consumption_p2: number
        consumption_p3: number
        consumption_p4?: number
        consumption_p5?: number
        consumption_p6?: number
        contracted_power_p1?: number
        contracted_power_p2?: number
        results: ComparisonResult[]
    }
    customerId?: string
}

export function SaveComparisonDialog({ isOpen, onClose, comparisonData, customerId }: SaveComparisonDialogProps) {
    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Por favor ingresa un nombre para la comparativa')
            return
        }

        setSaving(true)
        setError('')

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('No hay usuario autenticado')
                return
            }

            const { error: insertError } = await supabase
                .from('saved_comparisons')
                .insert({
                    user_id: user.id,
                    customer_id: customerId || null,
                    consumption_p1: comparisonData.consumption_p1,
                    consumption_p2: comparisonData.consumption_p2,
                    consumption_p3: comparisonData.consumption_p3,
                    contracted_power_p1: comparisonData.contracted_power_p1,
                    contracted_power_p2: comparisonData.contracted_power_p2,
                    results: comparisonData.results,
                    name,
                    notes
                })

            if (insertError) throw insertError

            alert('✅ Comparativa guardada exitosamente')
            onClose()
            setName('')
            setNotes('')
        } catch (err: any) {
            setError(err.message || 'Error al guardar la comparativa')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '2rem',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem'
                    }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ marginBottom: '1.5rem' }}>Guardar Comparativa</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Nombre de la comparativa<span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Comparativa Cliente ABC - Febrero 2026"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '6px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Notas (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Agrega notas adicionales sobre esta comparativa..."
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        background: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        color: '#c00'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
