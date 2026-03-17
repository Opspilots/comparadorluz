import { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '480px',
                    margin: '4rem auto',
                    fontFamily: 'var(--font-family, sans-serif)',
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: '#fef2f2', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        fontSize: '1.5rem',
                    }}>
                        !
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                        Algo ha ido mal
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                        {this.state.error?.message || 'Se ha producido un error inesperado.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        Recargar pagina
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
