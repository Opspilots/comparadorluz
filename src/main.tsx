import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'red', fontFamily: 'monospace' }}>
                    <h1>Algo salió mal.</h1>
                    <h3 style={{ marginTop: '1rem' }}>Error:</h3>
                    <pre style={{ background: '#fef2f2', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <h3 style={{ marginTop: '1rem' }}>Stack Trace:</h3>
                    <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: '4px', overflowX: 'auto', fontSize: '0.8rem' }}>
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
