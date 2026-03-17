import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTour } from './useTour'

const PAGE_NAMES: Record<string, string> = {
    '/': 'Panel de Control',
    '/crm': 'Gestión de Clientes',
    '/crm/new': 'Nuevo Cliente',
    '/comparator': 'Comparador de Tarifas',
    '/comparator/history': 'Historial de Comparativas',
    '/admin/tariffs': 'Gestión de Tarifas',
    '/admin/tariffs/upload': 'Carga Masiva',
    '/admin/tariffs/new': 'Nueva Tarifa',
    '/admin/suppliers': 'Comercializadoras',
    '/contracts': 'Gestión de Contratos',
    '/contracts/new': 'Nuevo Contrato',
    '/contracts/template': 'Plantilla de Contrato',
    '/commissioners': 'Comisionados',
    '/admin/messages': 'Mensajería',
    '/admin/messages/campaigns': 'Campañas',
    '/admin/compliance': 'Cumplimiento',
    '/settings': 'Ajustes',
}

function getPageName(pathname: string): string {
    // Exact match first
    if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname]

    // Dynamic route patterns
    if (/^\/crm\/[^/]+\/edit$/.test(pathname)) return 'Editar Cliente'
    if (/^\/crm\/[^/]+$/.test(pathname)) return 'Detalle del Cliente'
    if (/\/contacts\/new$/.test(pathname)) return 'Nuevo Contacto'
    if (/\/supply-points\/new$/.test(pathname)) return 'Nuevo Punto de Suministro'
    if (/\/admin\/tariffs\/batches\//.test(pathname)) return 'Detalle del Lote'
    if (/\/admin\/tariffs\/edit\//.test(pathname)) return 'Editar Tarifa'
    if (/\/admin\/tariffs\/[^/]+$/.test(pathname)) return 'Detalle de Tarifa'
    if (/^\/contracts\/[^/]+\/view$/.test(pathname)) return 'Vista Previa del Contrato'
    if (/^\/contracts\/[^/]+$/.test(pathname)) return 'Detalle del Contrato'
    if (/^\/commissioners\/[^/]+$/.test(pathname)) return 'Detalle del Comisionado'
    if (/\/admin\/messages\/campaigns\//.test(pathname)) return 'Editor de Campaña'
    if (/\/admin\/messages\/[^/]+$/.test(pathname)) return 'Conversación'

    // Prefix fallbacks
    if (pathname.startsWith('/crm')) return 'CRM'
    if (pathname.startsWith('/admin/tariffs')) return 'Tarifas'
    if (pathname.startsWith('/comparator')) return 'Comparador'
    if (pathname.startsWith('/contracts')) return 'Contratos'
    if (pathname.startsWith('/commissioners')) return 'Comisionados'
    if (pathname.startsWith('/admin/messages')) return 'Mensajería'

    return 'EnergyDeal CRM'
}

export function HelpFAB() {
    const [isOpen, setIsOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const location = useLocation()
    const { startTour, getStepCount } = useTour()

    const pageName = getPageName(location.pathname)
    const stepCount = getStepCount()

    // Close panel on route change
    useEffect(() => {
        setIsOpen(false)
    }, [location.pathname])

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    const handleStartTour = () => {
        setIsOpen(false)
        // Small delay so the panel closes before tour starts
        setTimeout(() => startTour(), 150)
    }

    return (
        <>
            <style>{`
                @keyframes help-fab-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                    50% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
                }
                @keyframes help-fab-panel-in {
                    from { opacity: 0; transform: translateY(8px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .help-fab-btn {
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    border: none;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9998;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
                }
                .help-fab-btn:not(.help-fab-open) {
                    animation: help-fab-pulse 3s ease-in-out infinite;
                }
                .help-fab-btn:hover {
                    transform: scale(1.08);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5), 0 4px 10px rgba(0, 0, 0, 0.12);
                }
                .help-fab-btn:active {
                    transform: scale(0.96);
                }
                .help-fab-open {
                    background: linear-gradient(135deg, #475569 0%, #334155 100%);
                    box-shadow: 0 4px 14px rgba(51, 65, 85, 0.4);
                }
                .help-fab-icon {
                    font-size: 22px;
                    font-weight: 700;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    line-height: 1;
                    font-family: var(--font-family);
                }
                .help-fab-icon-rotate {
                    transform: rotate(90deg);
                }
                .help-fab-panel {
                    position: fixed;
                    bottom: 90px;
                    right: 28px;
                    width: 280px;
                    background: white;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
                    z-index: 9999;
                    overflow: hidden;
                    animation: help-fab-panel-in 0.2s ease-out both;
                    font-family: var(--font-family);
                }
                .help-fab-panel-header {
                    padding: 1rem 1.125rem;
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border-bottom: 1px solid #dbeafe;
                }
                .help-fab-panel-page {
                    font-size: 0.9375rem;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.02em;
                    margin: 0;
                    line-height: 1.3;
                }
                .help-fab-panel-steps {
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #64748b;
                    margin: 0.25rem 0 0 0;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }
                .help-fab-panel-steps-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                    display: inline-block;
                }
                .help-fab-panel-body {
                    padding: 1rem 1.125rem;
                }
                .help-fab-start-btn {
                    width: 100%;
                    padding: 0.625rem 1rem;
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: white;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.15s ease;
                    letter-spacing: -0.01em;
                    font-family: var(--font-family);
                    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
                }
                .help-fab-start-btn:hover {
                    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
                    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
                    transform: translateY(-1px);
                }
                .help-fab-start-btn:active {
                    transform: translateY(0);
                }
                .help-fab-hint {
                    font-size: 0.6875rem;
                    color: #94a3b8;
                    text-align: center;
                    margin-top: 0.625rem;
                    line-height: 1.4;
                }
            `}</style>

            {/* Panel */}
            {isOpen && (
                <div ref={panelRef} className="help-fab-panel">
                    <div className="help-fab-panel-header">
                        <p className="help-fab-panel-page">{pageName}</p>
                        <p className="help-fab-panel-steps">
                            <span className="help-fab-panel-steps-dot" />
                            {stepCount} {stepCount === 1 ? 'paso' : 'pasos'} disponibles
                        </p>
                    </div>
                    <div className="help-fab-panel-body">
                        <button className="help-fab-start-btn" onClick={handleStartTour}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                            </svg>
                            Iniciar Guía Interactiva
                        </button>
                        <p className="help-fab-hint">
                            La guía resaltará cada zona y te explicará su función
                        </p>
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                ref={buttonRef}
                className={`help-fab-btn ${isOpen ? 'help-fab-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? 'Cerrar ayuda' : 'Ayuda y Guía'}
                aria-label={isOpen ? 'Cerrar ayuda' : 'Abrir ayuda y guía interactiva'}
            >
                <span className={`help-fab-icon ${isOpen ? 'help-fab-icon-rotate' : ''}`}>
                    {isOpen ? '✕' : '?'}
                </span>
            </button>
        </>
    )
}
