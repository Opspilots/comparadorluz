import { useState } from 'react'
import { CheckCircle2, Circle, Loader2, ExternalLink, AlertCircle, ArrowRight, Smartphone, Building2, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'

const WA_ICON = (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
)

const META_STEPS = [
    {
        number: '1',
        title: 'Inicia sesión en Meta',
        description: 'Se abrirá una ventana de Meta/Facebook. Accede con la cuenta que administra tu WhatsApp Business.',
    },
    {
        number: '2',
        title: 'Selecciona tu empresa',
        description: 'Elige tu cuenta de Meta Business Manager y la cuenta de WhatsApp Business asociada.',
    },
    {
        number: '3',
        title: 'Elige el número de teléfono',
        description: 'Selecciona el número de WhatsApp Business que quieres vincular al CRM.',
    },
]

const PREREQUISITES = [
    {
        icon: <Smartphone size={16} className="text-[#25D366]" />,
        text: 'Número de WhatsApp Business activo',
    },
    {
        icon: <Building2 size={16} className="text-[#25D366]" />,
        text: 'Cuenta en Meta Business Manager',
    },
    {
        icon: <ShieldCheck size={16} className="text-[#25D366]" />,
        text: 'Rol de administrador en Meta Business',
    },
]

interface WhatsAppConnectGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConnect: () => void
    connecting: boolean
    error: string | null
}

export function WhatsAppConnectGuide({ open, onOpenChange, onConnect, connecting, error }: WhatsAppConnectGuideProps) {
    const [checkedAll, setCheckedAll] = useState(false)
    const [checked, setChecked] = useState([false, false, false])

    const toggleCheck = (i: number) => {
        const next = checked.map((v, idx) => (idx === i ? !v : v))
        setChecked(next)
        setCheckedAll(next.every(Boolean))
    }

    const handleClose = () => {
        if (connecting) return
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-[480px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#075E54] to-[#128C7E] p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2 text-base font-semibold">
                            <span className="text-[#25D366]">{WA_ICON}</span>
                            Conectar WhatsApp Business
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-white/80 mt-1">
                        La conexión se realiza a través de Meta de forma segura. Solo toma 2 minutos.
                    </p>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Prerequisites checklist */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#64748b] mb-3">
                            Antes de empezar, confirma que tienes:
                        </p>
                        <div className="flex flex-col gap-2">
                            {PREREQUISITES.map((req, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleCheck(i)}
                                    className="flex items-center gap-3 p-3 rounded-[8px] border transition-colors cursor-pointer text-left w-full"
                                    style={{
                                        borderColor: checked[i] ? '#dcfce7' : '#e2e8f0',
                                        background: checked[i] ? '#f0fdf4' : '#f8fafc',
                                    }}
                                >
                                    {checked[i]
                                        ? <CheckCircle2 size={18} className="text-[#10b981] shrink-0" />
                                        : <Circle size={18} className="text-[#cbd5e1] shrink-0" />
                                    }
                                    <span className="flex items-center gap-2 text-sm text-[#0f172a] font-medium">
                                        {req.icon}
                                        {req.text}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {!checkedAll && (
                            <p className="text-xs text-[#94a3b8] mt-2">
                                Marca los 3 puntos para habilitar la conexión.
                            </p>
                        )}
                    </div>

                    {/* What will happen */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#64748b] mb-3">
                            Qué pasará cuando hagas clic:
                        </p>
                        <div className="flex flex-col gap-2">
                            {META_STEPS.map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#e2e8f0] text-[#64748b] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {step.number}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-[#0f172a]">{step.title}</p>
                                        <p className="text-xs text-[#64748b] mt-0.5">{step.description}</p>
                                    </div>
                                    {i < META_STEPS.length - 1 && (
                                        <ArrowRight size={14} className="text-[#cbd5e1] shrink-0 mt-1 ml-auto" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-sm text-red-700">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Error al conectar</p>
                                <p className="text-xs mt-0.5 text-red-600">{error}</p>
                                <a
                                    href="https://business.facebook.com/settings/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-red-700 underline mt-1 inline-flex items-center gap-1"
                                >
                                    Abre Meta Business Manager <ExternalLink size={11} />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                            disabled={connecting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white disabled:opacity-50"
                            onClick={onConnect}
                            disabled={!checkedAll || connecting}
                        >
                            {connecting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Conectando...
                                </>
                            ) : (
                                <>
                                    {WA_ICON}
                                    Abrir Meta
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-[11px] text-[#94a3b8] text-center -mt-2">
                        Tus credenciales se almacenan cifradas y nunca se comparten con terceros.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
