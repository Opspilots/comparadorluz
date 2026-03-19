import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { Check, AlertCircle } from 'lucide-react'

const PRESET_COLORS = [
    { label: 'Azul', value: '#2563eb' },
    { label: 'Indigo', value: '#4f46e5' },
    { label: 'Violeta', value: '#7c3aed' },
    { label: 'Rosa', value: '#db2777' },
    { label: 'Rojo', value: '#dc2626' },
    { label: 'Naranja', value: '#ea580c' },
    { label: 'Ambar', value: '#d97706' },
    { label: 'Esmeralda', value: '#059669' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Cyan', value: '#0891b2' },
    { label: 'Slate', value: '#475569' },
    { label: 'Negro', value: '#171717' },
]

const SIDEBAR_PRESETS = [
    { label: 'Oscuro', value: '#0f172a' },
    { label: 'Azul Oscuro', value: '#1e293b' },
    { label: 'Gris Oscuro', value: '#1f2937' },
    { label: 'Negro', value: '#111111' },
    { label: 'Marino', value: '#0c1a33' },
    { label: 'Carbon', value: '#18181b' },
]

export function BrandingSettingsCard() {
    const [primaryColor, setPrimaryColor] = useState('#2563eb')
    const [sidebarColor, setSidebarColor] = useState('#0f172a')
    const [companyName, setCompanyName] = useState('')
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    useEffect(() => {
        fetchBranding()
    }, [])

    const fetchBranding = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.company_id) return
        setCompanyId(profile.company_id)

        const { data: company } = await supabase
            .from('companies')
            .select('name, primary_color, sidebar_color')
            .eq('id', profile.company_id)
            .single()

        if (company) {
            setCompanyName(company.name || '')
            setPrimaryColor(company.primary_color || '#2563eb')
            setSidebarColor(company.sidebar_color || '#0f172a')
        }
    }

    const handleSave = async () => {
        if (!companyId) return
        setSaving(true)
        setSaved(false)
        setError(null)

        try {
            const { error: updateError } = await supabase
                .from('companies')
                .update({
                    name: companyName,
                    primary_color: primaryColor,
                    sidebar_color: sidebarColor,
                })
                .eq('id', companyId)

            if (updateError) throw updateError

            // Invalidate sidebar query to reflect changes
            queryClient.invalidateQueries({ queryKey: ['company-branding'] })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            console.error('Error saving branding:', err)
            const msg = err instanceof Error ? err.message : 'Error al guardar'
            setError(msg.includes('policy') || msg.includes('permission')
                ? 'No tienes permisos para cambiar estos ajustes. Contacta con un administrador.'
                : msg
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Error message */}
            {error && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.8125rem',
                }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    {error}
                </div>
            )}

            {/* Company Name */}
            <div>
                <label style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                }}>
                    Nombre de la Empresa
                </label>
                <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Mi Empresa S.L."
                    className="input"
                    style={{ maxWidth: '400px' }}
                />
            </div>

            {/* Primary Color */}
            <div>
                <label style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '0.375rem',
                }}>
                    Color del Logo / Marca
                </label>
                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                }}>
                    Color principal del logo, iconos activos y acentos en la interfaz.
                </p>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                }}>
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setPrimaryColor(color.value)}
                            title={color.label}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: color.value,
                                border: primaryColor === color.value
                                    ? '3px solid white'
                                    : '2px solid transparent',
                                boxShadow: primaryColor === color.value
                                    ? `0 0 0 2px ${color.value}, 0 2px 8px ${color.value}40`
                                    : '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {primaryColor === color.value && (
                                <Check size={16} color="white" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom color input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                    }}>
                        Color personalizado:
                    </label>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                        background: 'white',
                    }}>
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            style={{
                                width: '28px',
                                height: '28px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        />
                        <span style={{
                            fontSize: '0.8125rem',
                            fontFamily: 'monospace',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}>
                            {primaryColor}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sidebar Color */}
            <div>
                <label style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '0.375rem',
                }}>
                    Color del Sidebar
                </label>
                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                }}>
                    Color de fondo de la barra de navegación lateral.
                </p>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                }}>
                    {SIDEBAR_PRESETS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setSidebarColor(color.value)}
                            title={color.label}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: color.value,
                                border: sidebarColor === color.value
                                    ? '3px solid white'
                                    : '2px solid transparent',
                                boxShadow: sidebarColor === color.value
                                    ? `0 0 0 2px ${color.value}, 0 2px 8px rgba(0,0,0,0.3)`
                                    : '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {sidebarColor === color.value && (
                                <Check size={16} color="white" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom sidebar color input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                    }}>
                        Color personalizado:
                    </label>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                        background: 'white',
                    }}>
                        <input
                            type="color"
                            value={sidebarColor}
                            onChange={(e) => setSidebarColor(e.target.value)}
                            style={{
                                width: '28px',
                                height: '28px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        />
                        <span style={{
                            fontSize: '0.8125rem',
                            fontFamily: 'monospace',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}>
                            {sidebarColor}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div>
                <label style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                }}>
                    Vista Previa
                </label>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: sidebarColor,
                    borderRadius: '12px',
                    maxWidth: '300px',
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${primaryColor}80`,
                    }}>
                        <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 800 }}>
                            {companyName ? companyName.charAt(0).toUpperCase() : 'E'}
                        </span>
                    </div>
                    <div>
                        <div style={{
                            color: 'white',
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                        }}>
                            {companyName || 'Mi Empresa'}
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}>
                            CRM Energia
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                {saved && (
                    <span style={{
                        fontSize: '0.8125rem',
                        color: '#059669',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                    }}>
                        <Check size={16} /> Guardado
                    </span>
                )}
            </div>
        </div>
    )
}
