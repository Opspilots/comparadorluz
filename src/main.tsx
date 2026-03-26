import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
// PDF worker configuration moved to src/shared/lib/pdf-utils.ts
// so it's only loaded when PDF features are actually used (lazy routes).

// Using the user-friendly ErrorBoundary from shared components (imported in App.tsx).
// This top-level boundary is a last-resort fallback — no stack traces exposed.
class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '480px', margin: '4rem auto' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Algo salió mal</h1>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Se ha producido un error inesperado.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '0.625rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}
                    >
                        Recargar página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HelmetProvider>
            <RootErrorBoundary>
                <App />
            </RootErrorBoundary>
        </HelmetProvider>
    </React.StrictMode>,
)
