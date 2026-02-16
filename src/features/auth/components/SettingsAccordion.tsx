import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SettingsAccordionProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function SettingsAccordion({ title, description, icon, children, defaultOpen = false }: SettingsAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249, 250, 251, 0.5)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {icon && (
                        <div style={{ padding: '0.5rem', background: '#eff6ff', color: '#2563eb', borderRadius: '0.5rem' }}>
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h3>
                        {description && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.125rem 0 0 0' }}>{description}</p>}
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp size={20} style={{ color: '#9ca3af' }} />
                ) : (
                    <ChevronDown size={20} style={{ color: '#9ca3af' }} />
                )}
            </button>

            {isOpen && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ marginTop: '1.5rem' }}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}
