import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface InvoiceUploaderProps {
    onDataExtracted: (data: any) => void
}

export function InvoiceUploader({ onDataExtracted }: InvoiceUploaderProps) {
    const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setStatus('extracting')
        setErrorMessage('')

        try {
            // 1. Get current session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No hay sesión activa')

            // 2. Prepare FormData
            const formData = new FormData()
            formData.append('file', file)

            const user = session.user
            const companyId = user.user_metadata?.company_id || user.app_metadata?.company_id

            if (!companyId) throw new Error('No se pudo identificar la empresa del usuario')
            formData.append('company_id', companyId)

            // 3. Call Edge Function
            const { data, error } = await supabase.functions.invoke('extract-invoice-data', {
                body: formData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            })

            if (error) {
                console.error('Edge Function error:', error)
                console.error('Error context:', error.context)

                // Try to read the response body for the actual error message
                if (error.context && error.context instanceof Response) {
                    try {
                        const errorBody = await error.context.text()
                        console.error('Error response body:', errorBody)
                        const parsedError = JSON.parse(errorBody)
                        throw new Error(parsedError.error || error.message)
                    } catch (parseErr) {
                        console.error('Could not parse error body:', parseErr)
                    }
                }
                throw error
            }

            setStatus('success')
            onDataExtracted(data)
        } catch (err: any) {
            console.error('Error uploading/extracting:', err)
            console.error('Error details:', JSON.stringify(err, null, 2))
            setStatus('error')
            const errorMsg = err.message || 'Error al procesar la factura'
            setErrorMessage(errorMsg)
        }
    }

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
                        <div style={{ background: '#eff6ff', padding: '0.8rem', borderRadius: '50%', color: '#3b82f6' }}>
                            <Upload size={24} />
                        </div>
                        <div>
                            <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>Subir Factura para OCR</span>
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
                    <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>Analizando Factura...</span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Extrayendo CUPS, consumos y potencias</span>
                    </div>
                </div>
            )}

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
                        style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
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
                        style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Reintentar
                    </button>
                </div>
            )}
        </div>
    )
}
