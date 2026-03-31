import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { Check, AlertCircle, Upload, X, Image } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

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
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()

    // Track initial values for dirty detection
    const [initialValues, setInitialValues] = useState({
        name: '',
        primaryColor: '#2563eb',
        sidebarColor: '#0f172a',
        logoUrl: null as string | null,
    })

    useEffect(() => {
        fetchBranding()
    }, [])

    useEffect(() => {
        const dirty =
            companyName !== initialValues.name ||
            primaryColor !== initialValues.primaryColor ||
            sidebarColor !== initialValues.sidebarColor ||
            logoUrl !== initialValues.logoUrl
        setIsDirty(dirty)
    }, [companyName, primaryColor, sidebarColor, logoUrl, initialValues])

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
            .select('*')
            .eq('id', profile.company_id)
            .single()

        if (company) {
            setCompanyName(company.name || '')
            setPrimaryColor(company.primary_color || '#2563eb')
            setSidebarColor(company.sidebar_color || '#0f172a')
            setLogoUrl(company.logo_url || null)
            setInitialValues({
                name: company.name || '',
                primaryColor: company.primary_color || '#2563eb',
                sidebarColor: company.sidebar_color || '#0f172a',
                logoUrl: company.logo_url || null,
            })
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !companyId) return

        // Validate file
        if (!file.type.startsWith('image/')) {
            setError('El archivo debe ser una imagen (PNG, JPG, SVG, etc.)')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('La imagen no puede superar los 2 MB')
            return
        }

        setUploadingLogo(true)
        setError(null)

        try {
            const ext = file.name.split('.').pop()
            const path = `${companyId}/logo.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(path, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('company-logos')
                .getPublicUrl(path)

            setLogoUrl(urlData.publicUrl)
        } catch (err) {
            console.error('Error uploading logo:', err)
            setError('Error al subir el logo. Verifica que el bucket "company-logos" existe.')
        } finally {
            setUploadingLogo(false)
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemoveLogo = () => {
        setLogoUrl(null)
    }

    const handleSave = async () => {
        if (!companyId) return
        setSaving(true)
        setSaved(false)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setError('No se pudo verificar tu sesion.')
                setSaving(false)
                return
            }
            const { data: profile } = await supabase
                .from('users')
                .select('role, company_id')
                .eq('id', user.id)
                .maybeSingle()
            if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
                setError('No tienes permisos para cambiar estos ajustes. Contacta con un administrador.')
                setSaving(false)
                return
            }
            if (!profile.company_id) {
                setError('No se pudo determinar tu empresa. Contacta con un administrador.')
                setSaving(false)
                return
            }
            // Use company_id from authenticated user's profile, not from component state
            const authenticatedCompanyId = profile.company_id
            const { error: updateError } = await supabase
                .from('companies')
                .update({
                    name: companyName,
                    primary_color: primaryColor,
                    sidebar_color: sidebarColor,
                    logo_url: logoUrl,
                })
                .eq('id', authenticatedCompanyId)

            if (updateError) throw updateError

            queryClient.invalidateQueries({ queryKey: ['company-branding'] })
            setInitialValues({
                name: companyName,
                primaryColor,
                sidebarColor,
                logoUrl,
            })
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
        <div className="flex flex-col gap-6">
            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-red-900 text-[13px]">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Logo Upload */}
            <div>
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Logo de la Empresa
                </label>
                <p className="text-xs text-[#64748b] mb-3">
                    Sube el logo de tu empresa. Formatos: PNG, JPG, SVG. M&aacute;ximo 2 MB.
                </p>
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-[10px] border border-[#e2e8f0] bg-white flex items-center justify-center overflow-hidden">
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-[10px] border border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center">
                            <Image size={20} className="text-[#94a3b8]" />
                        </div>
                    )}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="gap-1.5"
                        >
                            <Upload size={14} />
                            {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Company Name */}
            <div>
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Nombre de la Empresa
                </label>
                <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Mi Empresa S.L."
                    className="max-w-[400px]"
                />
            </div>

            {/* Primary Color */}
            <div>
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-1">
                    Color del Logo / Marca
                </label>
                <p className="text-xs text-[#64748b] mb-3">
                    Color principal del logo, iconos activos y acentos en la interfaz.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setPrimaryColor(color.value)}
                            title={color.label}
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-150"
                            style={{
                                background: color.value,
                                border: primaryColor === color.value
                                    ? '3px solid white'
                                    : '2px solid transparent',
                                boxShadow: primaryColor === color.value
                                    ? `0 0 0 2px ${color.value}, 0 2px 8px ${color.value}40`
                                    : '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            {primaryColor === color.value && (
                                <Check size={16} color="white" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom color input */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748b] font-medium">
                        Color personalizado:
                    </span>
                    <div className="flex items-center gap-2 border border-[#e2e8f0] rounded-[8px] px-2 py-1 bg-white">
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-7 h-7 border-none rounded-[6px] cursor-pointer p-0"
                        />
                        <span className="text-[13px] font-mono font-semibold text-[#0f172a] uppercase">
                            {primaryColor}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sidebar Color */}
            <div>
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-1">
                    Color del Sidebar
                </label>
                <p className="text-xs text-[#64748b] mb-3">
                    Color de fondo de la barra de navegaci&oacute;n lateral.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {SIDEBAR_PRESETS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setSidebarColor(color.value)}
                            title={color.label}
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-150"
                            style={{
                                background: color.value,
                                border: sidebarColor === color.value
                                    ? '3px solid white'
                                    : '2px solid transparent',
                                boxShadow: sidebarColor === color.value
                                    ? `0 0 0 2px ${color.value}, 0 2px 8px rgba(0,0,0,0.3)`
                                    : '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            {sidebarColor === color.value && (
                                <Check size={16} color="white" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom sidebar color input */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748b] font-medium">
                        Color personalizado:
                    </span>
                    <div className="flex items-center gap-2 border border-[#e2e8f0] rounded-[8px] px-2 py-1 bg-white">
                        <input
                            type="color"
                            value={sidebarColor}
                            onChange={(e) => setSidebarColor(e.target.value)}
                            className="w-7 h-7 border-none rounded-[6px] cursor-pointer p-0"
                        />
                        <span className="text-[13px] font-mono font-semibold text-[#0f172a] uppercase">
                            {sidebarColor}
                        </span>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div>
                <label className="block text-[13px] font-semibold text-[#0f172a] mb-2">
                    Vista Previa
                </label>
                <div
                    className="flex items-center gap-3 p-4 rounded-[12px] max-w-[300px]"
                    style={{ background: sidebarColor }}
                >
                    {logoUrl ? (
                        <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center overflow-hidden">
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                        </div>
                    ) : (
                        <div
                            className="w-8 h-8 rounded-[8px] flex items-center justify-center"
                            style={{
                                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                                boxShadow: `0 2px 8px ${primaryColor}80`,
                            }}
                        >
                            <span className="text-white text-sm font-extrabold">
                                {companyName ? companyName.charAt(0).toUpperCase() : 'E'}
                            </span>
                        </div>
                    )}
                    <div>
                        <div className="text-white text-[15px] font-bold tracking-[-0.02em]">
                            {companyName || 'Mi Empresa'}
                        </div>
                        <div className="text-white/35 text-[11px] font-medium tracking-[0.06em] uppercase">
                            CRM Energ&iacute;a
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={isDirty && !saving ? 'relative' : ''}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                    {isDirty && !saving && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-white" />
                    )}
                </Button>
                {saved && (
                    <span className="text-[13px] text-[#059669] font-semibold flex items-center gap-1">
                        <Check size={16} /> Guardado
                    </span>
                )}
            </div>
        </div>
    )
}
