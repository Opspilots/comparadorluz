import { useState, useEffect } from 'react'
import { Mail, User, Check, Phone, Hash, MapPin, Percent } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { useCreateCommissioner } from '../lib/useCreateCommissioner'

interface CreateCommissionerDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateCommissionerDialog({ isOpen, onClose, onSuccess }: CreateCommissionerDialogProps) {
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [nif, setNif] = useState('')
    const [address, setAddress] = useState('')
    const [commissionPct, setCommissionPct] = useState('')

    const { createCommissioner, loading, error, success, resetStates } = useCreateCommissioner()

    useEffect(() => {
        if (isOpen) {
            setEmail('')
            setFullName('')
            setPhone('')
            setNif('')
            setAddress('')
            setCommissionPct('')
            resetStates()
        }
    }, [isOpen, resetStates])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const successCreate = await createCommissioner({
            email,
            fullName,
            phone,
            nif,
            address,
            commissionPct
        })

        if (successCreate) {
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 2000)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Comisionado</DialogTitle>
                </DialogHeader>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 mx-auto mb-6">
                            <Check size={32} />
                        </div>
                        <div className="text-xl font-semibold mb-2">¡Comisionado Creado!</div>
                        <p className="text-slate-500">
                            Se ha añadido a <strong>{fullName}</strong> correctamente al equipo.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-700">
                                Nombre Completo *
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="ejemplo@empresa.com"
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700">
                                    Teléfono
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="612 345 678"
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700">
                                    NIF / CIF
                                </label>
                                <div className="relative">
                                    <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={nif}
                                        onChange={e => setNif(e.target.value)}
                                        placeholder="12345678A"
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700">
                                    Comisión por defecto %
                                </label>
                                <div className="relative">
                                    <Percent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={commissionPct}
                                        onChange={e => setCommissionPct(e.target.value)}
                                        placeholder="Ej: 5.00"
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-700">
                                Dirección
                            </label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="Calle, Ciudad, CP"
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-500">
                            <p className="mb-2">
                                <strong className="font-semibold text-slate-700">Nota:</strong> Este comisionado será creado como entidad independiente.
                            </p>
                            <p>
                                Podrás configurar sus reglas de comisión inmediatamente.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="min-w-[120px]"
                            >
                                {loading ? 'Creando...' : 'Crear Comisionado'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
