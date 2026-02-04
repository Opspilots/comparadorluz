import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { Contract } from '@/shared/types'

export function ContractList() {
    const [loading, setLoading] = useState(true)
    const [contracts, setContracts] = useState<Contract[]>([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchContracts()
    }, [])

    const fetchContracts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('contracts')
            .select(`
                *,
                customers (name, cif),
                tariff_versions (tariff_name, supplier_name)
            `)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching contracts:', error)
        else setContracts(data || [])
        setLoading(false)
    }



    const filteredContracts = filter === 'all'
        ? contracts
        : contracts.filter(c => c.status === filter)

    // Helper for inline styles (since we don't have full Tailwind config yet)
    const badgeStyle = (status: string) => {
        const base = { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, border: '1px solid transparent' }
        switch (status) {
            case 'active': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }
            case 'signed': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }
            case 'pending': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
            case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
            default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
        }
    }

    return (
        <div className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Contratos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gestiona tus ventas firmadas y su estado.</p>
                </div>
                <Link to="/contracts/new" className="btn btn-primary">
                    <span>+</span> Nuevo Contrato
                </Link>
            </header>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Filters */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                    {['all', 'pending', 'signed', 'active', 'cancelled'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={filter === f ? 'btn btn-primary' : 'btn btn-secondary'}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', textTransform: 'capitalize' }}
                        >
                            {f === 'all' ? 'Todos' : f}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'var(--border-light)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ref. Contrato</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comercializadora / Tarifa</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Valor Anual</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Firmado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Cargando contratos...</td></tr>
                            ) : filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No hay contratos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract: any) => (
                                    <tr key={contract.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                            {contract.contract_number || '---'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 500 }}>{contract.customers?.name || 'Cliente desconocido'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contract.customers?.cif}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 500 }}>{contract.tariff_versions?.supplier_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contract.tariff_versions?.tariff_name}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={badgeStyle(contract.status)}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600 }}>
                                            {contract.annual_value_eur?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {contract.signed_at || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
