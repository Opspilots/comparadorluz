import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Upload, Loader2, CheckCircle, AlertCircle, Cpu, Sparkles } from 'lucide-react'
import { parseInvoiceLocally } from '../lib/invoiceParser'

interface InvoiceUploaderProps {
    onDataExtracted: (data: unknown) => void;
    supplyType?: 'electricity' | 'gas';
}

export function InvoiceUploader({ onDataExtracted, supplyType = 'electricity' }: InvoiceUploaderProps) {
    const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const [extractionMethod, setExtractionMethod] = useState<'local' | 'ai' | ''>('')

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setStatus('extracting')
        setErrorMessage('')
        setExtractionMethod('')

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No hay sesion activa')

            // Step 1: Try local PDF text extraction first (fast, no API cost)
            let localResult = null
            if (file.type === 'application/pdf') {
                try {
                    localResult = await parseInvoiceLocally(file)
                } catch (e) {
                    console.warn('Local parser failed, will use AI:', e)
                }
            }

            if (localResult && localResult._confidence >= 40) {
                // Local parsing was good enough
                console.log(`Using local parser result (confidence: ${localResult._confidence}%)`)
                setExtractionMethod('local')
                setStatus('success')
                onDataExtracted(localResult)
                return
            }

            // Step 2: Fallback to Gemini AI
            console.log('Falling back to AI extraction...')
            setExtractionMethod('ai')

            const formData = new FormData()
            formData.append('file', file)
            if (supplyType) formData.append('supply_type', supplyType)

            const { data, error } = await supabase.functions.invoke('extract-invoice-data', {
                body: formData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            })

            if (error) {
                console.error('Edge Function error:', error)
                if (error.context && error.context instanceof Response) {
                    let parsedMessage: string | undefined
                    try {
                        const errorBody = await error.context.text()
                        const parsed = JSON.parse(errorBody)
                        parsedMessage = parsed.error || error.message
                    } catch {
                        // JSON parsing failed — fall through to throw original error
                    }
                    if (parsedMessage) throw new Error(parsedMessage)
                }
                throw error
            }

            setStatus('success')
            onDataExtracted(data)
        } catch (error: unknown) {
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

            {status === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: '#10b981' }}>
                        <CheckCircle size={32} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#065f46', display: 'block' }}>Datos Extraidos</span>
                        <span style={{ fontSize: '0.85rem', color: '#065f46' }}>El formulario se ha autocompletado</span>
                    </div>
                    {extractionMethod && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                            {extractionMethod === 'local'
                                ? <><Cpu size={12} /> Lectura directa del PDF</>
                                : <><Sparkles size={12} /> Procesado con IA</>
                            }
                        </div>
                    )}
                    <button
                        onClick={() => { setStatus('idle'); setExtractionMethod('') }}
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
                        onClick={() => { setStatus('idle'); setExtractionMethod('') }}
                        style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Reintentar
                    </button>
                </div>
            )}
        </div>
    )
}
