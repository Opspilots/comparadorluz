import { Mail, Phone } from 'lucide-react';

export default function MessagingPage() {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
        }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--surface-alt, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                gap: '0.5rem',
            }}>
                <Mail style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
                <Phone style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
            </div>

            <p style={{
                maxWidth: '320px',
                textAlign: 'center',
                margin: 0,
                fontSize: '0.875rem',
                lineHeight: 1.6,
            }}>
                Selecciona una conversación de la lista o usa el buscador para iniciar un nuevo chat.
            </p>
        </div>
    );
}
