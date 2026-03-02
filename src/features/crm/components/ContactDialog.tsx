import { useState, useEffect } from 'react';

import type { Contact } from '@/shared/types';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface ContactDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (contact: Partial<Contact>) => Promise<void>;
    contact?: Contact | null;
    customerType: 'particular' | 'empresa';
    existingContacts: Contact[];
}

export function ContactDialog({ open, onClose, onSave, contact, customerType, existingContacts }: ContactDialogProps) {
    const [type, setType] = useState<'email' | 'phone'>('email');
    const [value, setValue] = useState('');
    const [label, setLabel] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (contact) {
            setType(contact.email ? 'email' : 'phone');
            setValue(contact.email || contact.phone || '');
            setLabel(contact.position || contact.first_name || '');
            setIsPrimary(contact.is_primary || false);
        } else {
            setType('email');
            setValue('');
            setLabel('');
            setIsPrimary(false);
        }
        setError('');
    }, [contact, open]);

    const handleSave = async () => {
        setError('');
        if (!value.trim()) {
            setError('El valor es obligatorio');
            return;
        }

        if (customerType === 'particular' && !contact) {
            const hasType = existingContacts.some(c => (type === 'email' ? c.email : c.phone));
            if (hasType) {
                setError(`El cliente particular ya tiene un ${type === 'email' ? 'email' : 'teléfono'}.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            await onSave({
                id: contact?.id,
                email: type === 'email' ? value : undefined,
                phone: type === 'phone' ? value : undefined,
                position: label,
                first_name: label,
                is_primary: isPrimary
            });
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    const hasEmail = existingContacts.some(c => c.email) && (!contact || !contact.email);
    const hasPhone = existingContacts.some(c => c.phone) && (!contact || !contact.phone);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {contact ? 'Editar Contacto' : 'Añadir Contacto'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">Tipo de contacto</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as 'email' | 'phone')}
                            disabled={!!contact}
                            className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 ${contact ? 'opacity-60' : ''}`}
                        >
                            <option value="email" disabled={customerType === 'particular' && hasEmail}>Email</option>
                            <option value="phone" disabled={customerType === 'particular' && hasPhone}>Teléfono</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">{type === 'email' ? 'Dirección de Email' : 'Número de Teléfono'}</label>
                        <Input
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder={type === 'email' ? 'ejemplo@correo.com' : '600123456'}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">Etiqueta / Nombre</label>
                        <Input
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Ej: Facturación, Personal, Oficina..."
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Nombre descriptivo para este contacto.</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="primary"
                            checked={isPrimary}
                            onChange={e => setIsPrimary(e.target.checked)}
                            className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="primary" className="font-normal cursor-pointer text-sm text-gray-700">Marcar como principal</label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
