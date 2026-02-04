import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'

interface TariffVersion {
    id: string
    supplier_id: string
    tariff_name: string
    tariff_code: string | null
    tariff_type: string
    valid_from: string
    valid_to: string | null
    is_active: boolean
    created_at: string
    suppliers: {
        id: string
        name: string
        slug: string
    }
}

export function TariffListPage() {
    const [tariffs, setTariffs] = useState<TariffVersion[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        loadTariffs()
    }, [])

    async function loadTariffs() {
        try {
            const { data, error } = await supabase
                .from('tariff_versions')
                .select('*, suppliers(id, name, slug)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTariffs(data || [])
        } catch (error) {
            console.error('Error loading tariffs:', error)
            alert('Error al cargar tarifas')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`¿Estás seguro de que quieres archivar la tarifa "${name}"?`)) return

        try {
            const { error } = await supabase
                .from('tariff_versions')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
            loadTariffs()
        } catch (error) {
            console.error('Error archiving tariff:', error)
            alert('Error al archivar la tarifa')
        }
    }

    const filteredTariffs = tariffs.filter(t =>
        t.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tariff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tariff_type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--border)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-muted)' }}>Cargando tarifas...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        color: 'var(--text-main)',
                        letterSpacing: '-0.02em'
                    }}>
                        Gestión de Tarifas
                    </h1>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.95rem',
                        fontWeight: '400'
                    }}>
                        Administra y consulta las tarifas eléctricas de tu comercializadora
                    </p>
                </div>
                <Link
                    to="/tariffs/new"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-hover)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    <span style={{ fontSize: '1.1rem' }}>+</span> Nueva Tarifa
                </Link>

            </div>

            {/* Search Bar */}
            <div style={{
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
                    <input
                        type="text"
                        placeholder="Buscar por comercializadora, nombre o tipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.625rem 1rem 0.625rem 2.5rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            transition: 'all 0.2s'
                        }}
                    />
                    <span style={{
                        position: 'absolute',
                        left: '0.875rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1.1rem'
                    }}>🔍</span>
                </div>
                {searchTerm && (
                    <span style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)'
                    }}>
                        {filteredTariffs.length} resultado{filteredTariffs.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Table Card */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                {filteredTariffs.length === 0 ? (
                    <div style={{
                        padding: '4rem 2rem',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '1rem',
                            opacity: 0.5
                        }}>📄</div>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: 'var(--text-main)'
                        }}>
                            {searchTerm ? 'No se encontraron tarifas' : 'No hay tarifas activas'}
                        </h3>
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem',
                            marginBottom: '1.5rem'
                        }}>
                            {searchTerm
                                ? 'Intenta con otros términos de búsqueda'
                                : 'Crea tu primera tarifa para comenzar'
                            }
                        </p>
                        {!searchTerm && (
                            <Link
                                to="/tariffs/new"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    textDecoration: 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>+</span> Crear Primera Tarifa
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.875rem'
                        }}>
                            <thead>
                                <tr style={{
                                    backgroundColor: '#fafbfc',
                                    borderBottom: '1px solid var(--border)'
                                }}>
                                    <th style={{
                                        padding: '1rem 1.25rem',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Comercializadora
                                    </th>
                                    <th style={{
                                        padding: '1rem 1.25rem',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Nombre de Tarifa
                                    </th>
                                    <th style={{
                                        padding: '1rem 1.25rem',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Tipo
                                    </th>
                                    <th style={{
                                        padding: '1rem 1.25rem',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Válida desde
                                    </th>
                                    <th style={{
                                        padding: '1rem 1.25rem',
                                        textAlign: 'right',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTariffs.map((tariff) => (
                                    <tr
                                        key={tariff.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-light)',
                                            transition: 'background-color 0.15s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = '#fafbfc'
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                    >
                                        <td style={{
                                            padding: '1.125rem 1.25rem',
                                            fontWeight: '500',
                                            color: 'var(--text-main)'
                                        }}>
                                            {tariff.suppliers?.name || 'N/A'}
                                        </td>
                                        <td style={{
                                            padding: '1.125rem 1.25rem',
                                            color: 'var(--text-main)'
                                        }}>
                                            <div>{tariff.tariff_name}</div>
                                            {tariff.tariff_code && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '0.125rem'
                                                }}>
                                                    {tariff.tariff_code}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.125rem 1.25rem' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.625rem',
                                                borderRadius: '6px',
                                                backgroundColor: '#eff6ff',
                                                color: '#1e40af',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                letterSpacing: '0.025em'
                                            }}>
                                                {tariff.tariff_type}
                                            </span>
                                        </td>
                                        <td style={{
                                            padding: '1.125rem 1.25rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.875rem'
                                        }}>
                                            {new Date(tariff.valid_from).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td style={{
                                            padding: '1.125rem 1.25rem',
                                            textAlign: 'right'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                gap: '0.5rem'
                                            }}>
                                                <button
                                                    onClick={() => navigate(`/tariffs/${tariff.id}`)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'white',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.875rem'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#eff6ff'
                                                        e.currentTarget.style.borderColor = '#3b82f6'
                                                        e.currentTarget.style.color = '#3b82f6'
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'white'
                                                        e.currentTarget.style.borderColor = 'var(--border)'
                                                        e.currentTarget.style.color = 'var(--text-muted)'
                                                    }}
                                                    title="Editar tarifa"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tariff.id, tariff.tariff_name)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'white',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.875rem'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fef2f2'
                                                        e.currentTarget.style.borderColor = '#ef4444'
                                                        e.currentTarget.style.color = '#ef4444'
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'white'
                                                        e.currentTarget.style.borderColor = 'var(--border)'
                                                        e.currentTarget.style.color = 'var(--text-muted)'
                                                    }}
                                                    title="Archivar tarifa"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {filteredTariffs.length > 0 && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem'
                }}>
                    Mostrando {filteredTariffs.length} tarifa{filteredTariffs.length !== 1 ? 's' : ''} activa{filteredTariffs.length !== 1 ? 's' : ''}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}


