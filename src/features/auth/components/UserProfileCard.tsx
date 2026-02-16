import { User as UserType } from '@/shared/types';
import { User, Mail, Calendar } from 'lucide-react'

interface UserProfileCardProps {
    user: UserType;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
    if (!user) return null;

    return (
        <div className="card" style={{ height: '100%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ padding: '0.75rem', background: 'var(--primary-light, #eff6ff)', color: 'var(--primary)', borderRadius: '0.75rem' }}>
                    <User size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Perfil de Usuario</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Información de tu cuenta</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ width: '2.5rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <Mail size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Correo Electrónico</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ width: '2.5rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fecha de Registro</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(user.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
