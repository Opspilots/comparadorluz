
import { useState, useEffect } from 'react';

import type { Contact } from '@/shared/types';

interface ContactDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (contact: Partial<Contact>) => Promise<void>;
    contact?: Contact | null;
    customerType: 'particular' | 'empresa';
    existingContacts: Contact[];
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50
}

const dialogStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '425px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none'
}

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    background: 'white',
    outline: 'none'
}

const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    display: 'block',
    marginBottom: '0.375rem'
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

    if (!open) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                    {contact ? 'Editar Contacto' : 'Añadir Contacto'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && (
                        <div style={{ fontSize: '0.875rem', color: '#ef4444', background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>Tipo de contacto</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as 'email' | 'phone')}
                            disabled={!!contact}
                            style={{ ...selectStyle, opacity: contact ? 0.6 : 1 }}
                        >
                            <option value="email" disabled={customerType === 'particular' && hasEmail}>Email</option>
                            <option value="phone" disabled={customerType === 'particular' && hasPhone}>Teléfono</option>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>{type === 'email' ? 'Dirección de Email' : 'Número de Teléfono'}</label>
                        <input
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder={type === 'email' ? 'ejemplo@correo.com' : '600123456'}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Etiqueta / Nombre</label>
                        <input
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Ej: Facturación, Personal, Oficina..."
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Nombre descriptivo para este contacto.</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="primary"
                            checked={isPrimary}
                            onChange={e => setIsPrimary(e.target.checked)}
                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                        />
                        <label htmlFor="primary" style={{ fontWeight: 400, cursor: 'pointer', fontSize: '0.875rem' }}>Marcar como principal</label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
