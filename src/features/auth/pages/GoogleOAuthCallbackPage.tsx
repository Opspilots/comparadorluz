import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { getCompanySettings, updateCompanySettings } from '@/features/auth/lib/settings-service'

type Status = 'loading' | 'success' | 'error'

export function GoogleOAuthCallbackPage() {
    const [status, setStatus] = useState<Status>('loading')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const oauth = searchParams.get('oauth')
        if (oauth !== 'google') {
            navigate('/settings', { replace: true })
            return
        }

        let timeoutId: ReturnType<typeof setTimeout>

        const handleCallback = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                if (sessionError) throw sessionError

                const providerToken = session?.provider_token ?? null
                const providerRefreshToken = session?.provider_refresh_token ?? null

                if (!providerRefreshToken) {
                    setErrorMessage('No se recibió el token de actualización de Google. Asegúrate de aceptar todos los permisos solicitados.')
                    setStatus('error')
                    timeoutId = setTimeout(() => navigate('/settings', { replace: true }), 4000)
                    return
                }

                const existingSettings = await getCompanySettings()
                await updateCompanySettings({
                    ...existingSettings,
                    google_refresh_token: providerRefreshToken,
                    google_access_token: providerToken ?? undefined,
                    email_from: session?.user?.email ?? existingSettings.email_from
                })

                setStatus('success')
                timeoutId = setTimeout(() => navigate('/settings', { replace: true }), 2500)
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Error inesperado al guardar las credenciales de Google.'
                setErrorMessage(msg)
                setStatus('error')
                timeoutId = setTimeout(() => navigate('/settings', { replace: true }), 4000)
            }
        }

        handleCallback()

        return () => clearTimeout(timeoutId)
    }, [navigate, searchParams])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '1rem',
                boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                padding: '3rem 2.5rem',
                maxWidth: 420,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                textAlign: 'center'
            }}>
                {status === 'loading' && (
                    <>
                        <div style={{ color: '#2563eb' }}>
                            <Loader2 size={48} className="animate-spin" />
                        </div>
                        <div>
                            <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                                Conectando con Google
                            </p>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                                Guardando credenciales de Gmail...
                            </p>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ color: '#16a34a' }}>
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                                ¡Cuenta conectada!
                            </p>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                                Tu cuenta de Gmail se ha vinculado correctamente.
                            </p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ color: '#dc2626' }}>
                            <AlertCircle size={48} />
                        </div>
                        <div>
                            <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                                Error al conectar
                            </p>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>
                                {errorMessage}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af' }}>
                                Volviendo a ajustes en unos segundos...
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
