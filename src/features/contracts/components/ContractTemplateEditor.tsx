import { useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { Save, RotateCcw, Eye, RefreshCw, Palette, AlignLeft, FileText, Type } from 'lucide-react'
import { ContractDocument, DEFAULT_CONTRACT_TEMPLATE } from './ContractDocument'
import { useContractTemplate } from '../hooks/useContractTemplate'
import { ContractTemplate } from '@/shared/types'

// ─── Dummy contract data for preview ───────────────────────────────────────
const PREVIEW_CONTRACT = {
    contract_number: 'CTR-2026-001',
    signed_at: new Date().toLocaleDateString('es-ES'),
    annual_value_eur: 3600,
    status: 'active',
    notes: 'Cliente VIP. Condiciones especiales acordadas.',
}
const PREVIEW_CUSTOMER = {
    id: 'preview', company_id: 'preview', cif: 'B12345678',
    name: 'Empresa Ejemplo S.L.', address: 'Calle Mayor 1, 28001 Madrid',
    website: 'contacto@empresa.es', status: 'cliente' as const,
    created_at: '', updated_at: '',
}
const PREVIEW_TARIFF = {
    id: 'preview', company_id: 'preview', supplier_id: 'preview',
    tariff_name: 'Tarifa Plana Plus', tariff_type: '2.0TD',
    valid_from: '', created_at: '', updated_at: '',
    suppliers: { id: 'prev', name: 'Iberdrola', slug: 'iberdrola', created_at: '', is_active: true },
}
const PREVIEW_SUPPLY = {
    id: 'preview', company_id: 'preview', customer_id: 'preview',
    cups: 'ES0031405678901234YA', address: 'Calle Mayor 1, 28001 Madrid',
    contracted_power_kw: 15, energy_type: 'electricity' as const,
    created_at: '', updated_at: '',
}

// ─── Color picker field ─────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input
                        type="color"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        style={{ width: 36, height: 36, border: '2px solid #e2e8f0', borderRadius: 8, padding: 2, cursor: 'pointer', background: 'none' }}
                    />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={e => {
                        const v = e.target.value
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
                    }}
                    maxLength={7}
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: '0.8125rem', fontFamily: 'monospace', outline: 'none', background: '#f8fafc' }}
                />
                <div style={{ width: 28, height: 28, borderRadius: 6, background: value, border: '1px solid #e2e8f0', flexShrink: 0 }} />
            </div>
        </div>
    )
}

// ─── Text field ─────────────────────────────────────────────────────────────
function TextField({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean;
}) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: '0.8125rem', outline: 'none', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: '0.8125rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
            )}
        </div>
    )
}

// ─── Toggle field ────────────────────────────────────────────────────────────
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500 }}>{label}</span>
            <button
                type="button"
                onClick={() => onChange(!value)}
                style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: value ? '#2563eb' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s',
                }}
            >
                <span style={{
                    position: 'absolute', top: 3, left: value ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
            </button>
        </div>
    )
}

// ─── Number field ────────────────────────────────────────────────────────────
function NumberField({ label, value, onChange, min, max }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                    type="range"
                    min={min ?? 1}
                    max={max ?? 100}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', minWidth: 32, textAlign: 'right' }}>{value}</span>
            </div>
        </div>
    )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color="#2563eb" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{title}</span>
        </div>
    )
}

// ─── Main editor ─────────────────────────────────────────────────────────────
type Draft = Omit<ContractTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>

export function ContractTemplateEditor() {
    const { template, loading, saving, saveTemplate, resetToDefaults } = useContractTemplate()
    const [draft, setDraft] = useState<Draft>({ ...DEFAULT_CONTRACT_TEMPLATE })
    const [previewKey, setPreviewKey] = useState(0)
    const [previewDraft, setPreviewDraft] = useState<Draft>({ ...DEFAULT_CONTRACT_TEMPLATE })
    const [saved, setSaved] = useState(false)
    const [activeTab, setActiveTab] = useState<'colors' | 'header' | 'footer' | 'legal'>('colors')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (template) {
            const d: Draft = {
                primary_color: template.primary_color,
                accent_color: template.accent_color,
                text_color: template.text_color,
                section_bg_color: template.section_bg_color,
                notes_bg_color: template.notes_bg_color,
                notes_border_color: template.notes_border_color,
                contract_title: template.contract_title,
                company_name: template.company_name,
                company_tagline: template.company_tagline ?? '',
                company_logo_url: template.company_logo_url ?? '',
                footer_text: template.footer_text,
                footer_show_date: template.footer_show_date,
                footer_show_page_number: template.footer_show_page_number,
                font_size_base: template.font_size_base,
                page_padding: template.page_padding,
                custom_legal_text: template.custom_legal_text ?? '',
            }
            setDraft(d)
            setPreviewDraft(d)
        }
    }, [template])

    function set<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft(prev => {
            const next = { ...prev, [key]: value }
            // Debounce preview refresh
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                setPreviewDraft(next)
                setPreviewKey(k => k + 1)
            }, 800)
            return next
        })
    }

    function refreshPreview() {
        setPreviewDraft({ ...draft })
        setPreviewKey(k => k + 1)
    }

    async function handleSave() {
        const ok = await saveTemplate(draft)
        if (ok) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
    }

    function handleReset() {
        resetToDefaults()
        setDraft({ ...DEFAULT_CONTRACT_TEMPLATE })
        setPreviewDraft({ ...DEFAULT_CONTRACT_TEMPLATE })
        setPreviewKey(k => k + 1)
    }

    const tabs = [
        { id: 'colors' as const, label: 'Colores', icon: Palette },
        { id: 'header' as const, label: 'Cabecera', icon: AlignLeft },
        { id: 'footer' as const, label: 'Pie', icon: FileText },
        { id: 'legal' as const, label: 'Tipografía y Legal', icon: Type },
    ]

    const fakeTemplate = {
        id: '', company_id: '', created_at: '', updated_at: '',
        ...previewDraft,
    } as ContractTemplate

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando plantilla...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px' }}>
                <div>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                        Plantilla de Contratos
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0' }}>
                        Personaliza el diseño, colores y texto de todos los contratos generados
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleReset}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', fontSize: '0.875rem', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
                    >
                        <RotateCcw size={14} />
                        Restablecer
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', border: 'none', borderRadius: 8, background: saved ? '#10b981' : '#2563eb', fontSize: '0.875rem', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }}
                    >
                        <Save size={14} />
                        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* Main two-column layout */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, minHeight: 0 }}>

                {/* Left panel — settings */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 4px' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px 8px',
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                                    color: activeTab === tab.id ? '#2563eb' : '#94a3b8',
                                    fontWeight: activeTab === tab.id ? 700 : 500,
                                    fontSize: '0.6875rem', transition: 'all 0.15s',
                                }}
                            >
                                <tab.icon size={15} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

                        {activeTab === 'colors' && (
                            <>
                                <SectionHeader icon={Palette} title="Colores del documento" />
                                <ColorField label="Color principal" value={draft.primary_color} onChange={v => set('primary_color', v)} />
                                <ColorField label="Color de acento (firmas)" value={draft.accent_color} onChange={v => set('accent_color', v)} />
                                <ColorField label="Color del texto" value={draft.text_color} onChange={v => set('text_color', v)} />
                                <ColorField label="Fondo de secciones" value={draft.section_bg_color} onChange={v => set('section_bg_color', v)} />
                                <ColorField label="Fondo de anotaciones" value={draft.notes_bg_color} onChange={v => set('notes_bg_color', v)} />
                                <ColorField label="Borde de anotaciones" value={draft.notes_border_color} onChange={v => set('notes_border_color', v)} />
                            </>
                        )}

                        {activeTab === 'header' && (
                            <>
                                <SectionHeader icon={AlignLeft} title="Cabecera del contrato" />
                                <TextField
                                    label="Título del contrato"
                                    value={draft.contract_title}
                                    onChange={v => set('contract_title', v)}
                                    placeholder="CONTRATO DE SUMINISTRO"
                                />
                                <TextField
                                    label="Nombre de empresa"
                                    value={draft.company_name}
                                    onChange={v => set('company_name', v)}
                                    placeholder="ENERGY DEAL"
                                />
                                <TextField
                                    label="Eslogan o subtítulo"
                                    value={draft.company_tagline ?? ''}
                                    onChange={v => set('company_tagline', v)}
                                    placeholder="Ej: La mejor tarifa eléctrica"
                                />
                                <TextField
                                    label="URL del logotipo"
                                    value={draft.company_logo_url ?? ''}
                                    onChange={v => set('company_logo_url', v)}
                                    placeholder="https://... (imagen PNG o JPG)"
                                />
                                {draft.company_logo_url && (
                                    <div style={{ marginBottom: 12, padding: 8, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 6px' }}>Vista previa del logotipo:</p>
                                        <img
                                            src={draft.company_logo_url}
                                            alt="Logo"
                                            style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }}
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'footer' && (
                            <>
                                <SectionHeader icon={FileText} title="Pie de página" />
                                <TextField
                                    label="Texto del pie de página"
                                    value={draft.footer_text}
                                    onChange={v => set('footer_text', v)}
                                    multiline
                                    placeholder="Texto informativo o legal del pie..."
                                />
                                <ToggleField
                                    label="Mostrar fecha de generación"
                                    value={draft.footer_show_date}
                                    onChange={v => set('footer_show_date', v)}
                                />
                                <ToggleField
                                    label="Mostrar número de página"
                                    value={draft.footer_show_page_number}
                                    onChange={v => set('footer_show_page_number', v)}
                                />
                            </>
                        )}

                        {activeTab === 'legal' && (
                            <>
                                <SectionHeader icon={Type} title="Tipografía y maquetación" />
                                <NumberField
                                    label={`Tamaño de fuente base (${draft.font_size_base}pt)`}
                                    value={draft.font_size_base}
                                    onChange={v => set('font_size_base', v)}
                                    min={8}
                                    max={14}
                                />
                                <NumberField
                                    label={`Márgenes de página (${draft.page_padding}pt)`}
                                    value={draft.page_padding}
                                    onChange={v => set('page_padding', v)}
                                    min={20}
                                    max={80}
                                />

                                <div style={{ marginTop: 16 }}>
                                    <SectionHeader icon={FileText} title="Cláusulas legales adicionales" />
                                    <TextField
                                        label="Texto legal (aparece antes de las firmas)"
                                        value={draft.custom_legal_text ?? ''}
                                        onChange={v => set('custom_legal_text', v)}
                                        multiline
                                        placeholder="Las partes acuerdan que el presente contrato se regirá por la legislación vigente..."
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview refresh hint */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                        <button
                            onClick={refreshPreview}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: 'white', fontSize: '0.8125rem', color: '#2563eb', cursor: 'pointer', fontWeight: 600, width: '100%', justifyContent: 'center' }}
                        >
                            <Eye size={13} />
                            <RefreshCw size={13} />
                            Actualizar vista previa
                        </button>
                    </div>
                </div>

                {/* Right panel — live PDF preview */}
                <div style={{ background: '#525659', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px 16px', background: '#3d3f42', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Eye size={14} color="rgba(255,255,255,0.6)" />
                        <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                            Vista previa — actualiza automáticamente al editar
                        </span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <PDFViewer
                            key={previewKey}
                            width="100%"
                            height="100%"
                            showToolbar={false}
                            style={{ border: 'none', display: 'block' }}
                        >
                            <ContractDocument
                                contract={PREVIEW_CONTRACT}
                                customer={PREVIEW_CUSTOMER}
                                tariff={PREVIEW_TARIFF}
                                supplyPoint={PREVIEW_SUPPLY}
                                template={fakeTemplate}
                            />
                        </PDFViewer>
                    </div>
                </div>

            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
