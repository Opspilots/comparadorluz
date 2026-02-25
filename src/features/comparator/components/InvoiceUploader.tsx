import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface InvoiceUploaderProps {
    onDataExtracted: (data: unknown) => void;
    supplyType?: 'electricity' | 'gas';
}

export function InvoiceUploader({ onDataExtracted, supplyType = 'electricity' }: InvoiceUploaderProps) {
    const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // ... (rest of logic same)
        const file = event.target.files?.[0]
        if (!file) return

        setStatus('extracting')
        setErrorMessage('')

        try {
            // ... (auth and form data prep same)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No hay sesión activa')

            const formData = new FormData()
            formData.append('file', file)
            if (supplyType) formData.append('supply_type', supplyType)
            // Pass supplyType to edge function if needed, or just use it for UI
            if (supplyType) formData.append('supply_type', supplyType);

            const user = session.user
            const companyId = user.user_metadata?.company_id || user.app_metadata?.company_id

            if (!companyId) throw new Error('No se pudo identificar la empresa del usuario')
            formData.append('company_id', companyId)

            const { data, error } = await supabase.functions.invoke('extract-invoice-data', {
                body: formData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            })
            // ... (rest of error handling same)
            if (error) {
                console.error('Edge Function error:', error)
                if (error.context && error.context instanceof Response) {
                    try {
                        const errorBody = await error.context.text()
                        const parsedError = JSON.parse(errorBody)
                        throw new Error(parsedError.error || error.message)
                    } catch (err: unknown) {
                        console.error('Failed to parse error body:', err)
                    }
                }
                throw error
            }

            setStatus('success')
            onDataExtracted(data)
        } catch (error: unknown) {
            // ... error handling
            console.error('Error uploading/extracting:', error)
            setStatus('error')
            setErrorMessage(error instanceof Error ? error.message : 'Error al procesar la factura')
        }
    }

    const labelText = supplyType === 'gas' ? 'Subir Factura de Gas' : 'Subir Factura de Luz';
    const activeColor = supplyType === 'gas' ? '#f97316' : '#3b82f6';
    const activeBg = supplyType === 'gas' ? '#fff7ed' : '#eff6ff';

    return (
        <div style={{
            background: 'white',
            border: '2px dashed #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            transition: 'all 0.2s ease',
            borderColor: status === 'success' ? '#10b981' : (status === 'error' ? '#ef4444' : '#e5e7eb'),
            backgroundColor: status === 'extracting' ? '#f9fafb' : 'white'
        }}>
            {status === 'idle' && (
                <label style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: activeBg, padding: '0.8rem', borderRadius: '50%', color: activeColor }}>
                            <Upload size={24} />
                        </div>
                        <div>
                            <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>{labelText}</span>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>PDF o Imagen (max 10MB)</span>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </div>
                </label>
            )}

            {status === 'extracting' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', padding: '0.5rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: activeColor }} />
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>Analizando Factura...</span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Extrayendo datos de {supplyType === 'gas' ? 'gas' : 'luz'}...</span>
                    </div>
                </div>
            )}

            {/* Success and Error states remain similar but could also use activeColor if needed, handling success generally green/red is fine */}
            {status === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: '#10b981' }}>
                        <CheckCircle size={32} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#065f46', display: 'block' }}>¡Datos Extraídos!</span>
                        <span style={{ fontSize: '0.85rem', color: '#065f46' }}>El formulario se ha autocompletado</span>
                    </div>
                    <button
                        onClick={() => setStatus('idle')}
                        style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Subir otra factura
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: '#ef4444' }}>
                        <AlertCircle size={32} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#991b1b', display: 'block' }}>Error OCR</span>
                        <span style={{ fontSize: '0.85rem', color: '#991b1b' }}>{errorMessage}</span>
                    </div>
                    <button
                        onClick={() => setStatus('idle')}
                        style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Reintentar
                    </button>
                </div>
            )}
        </div>
    )
}
