import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { MainLayout } from '@/shared/components/layout/MainLayout'
import { TariffBatchUpload } from '@/features/tariffs/components/TariffBatchUpload'
import { TariffBatchReview } from '@/features/tariffs/components/TariffBatchReview'
import { TariffListPage } from '@/features/tariffs/pages/TariffListPage'
import { TariffEditorPage } from '@/features/tariffs/pages/TariffEditorPage'
import { Login } from '@/features/auth/components/Login'
import { CustomerList } from '@/features/crm/components/CustomerList'
import { CustomerDetails } from '@/features/crm/components/CustomerDetails'
import { ComparatorForm } from '@/features/comparator/components/ComparatorForm'
import { ContactForm } from '@/features/crm/components/ContactForm'
import { SupplyPointForm } from '@/features/crm/components/SupplyPointForm'

import { CustomerForm } from '@/features/crm/components/CustomerForm'
import { ContractList } from '@/features/contracts/components/ContractList'
import { ContractForm } from '@/features/contracts/components/ContractForm'

function Dashboard() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Panel de Control</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Bienvenido de nuevo. Aquí tienes un resumen de tu actividad.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '12px', fontSize: '1.5rem' }}>👥</div>
                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>+12%</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Clientes</div>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>142</div>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '12px', fontSize: '1.5rem' }}>⚖️</div>
                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>+5%</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Comparativas Realizadas</div>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>84</div>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '12px', fontSize: '1.5rem' }}>💰</div>
                        <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem' }}>-2%</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ahorro Promedio</div>
                        <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>18.4%</div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Actividad Reciente</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.925rem', fontWeight: 600 }}>Contrato firmado: Endesa One</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cliente: Juan Pérez S.L.</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hace 2h</div>
                        </div>
                        {/* Mock activities */}
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--text-main)', color: 'white' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'white' }}>Accesos Rápidos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/comparator" className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>⚖️ Nueva Comparativa</Link>
                        <Link to="/crm/new" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>👥 Registrar Cliente</Link>
                        <Link to="/tariffs/upload" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>📤 Subir Tarifas</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PrivateRoute({ children }: { children: JSX.Element }) {
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) return <div>Cargando...</div>
    if (!session) return <Navigate to="/login" />

    return children
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <PrivateRoute>
                        <MainLayout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/comparator" element={<ComparatorForm />} />
                                <Route path="/crm" element={<CustomerList />} />
                                <Route path="/crm/new" element={<CustomerForm />} />
                                <Route path="/crm/:id" element={<CustomerDetails />} />
                                <Route path="/crm/:customerId/contacts/new" element={<ContactForm />} />
                                <Route path="/crm/:customerId/supply-points/new" element={<SupplyPointForm />} />
                                <Route path="/contracts/new" element={<ContractForm />} />

                                {/* Tariffs */}
                                <Route path="/tariffs" element={<TariffListPage />} />
                                <Route path="/tariffs/new" element={<TariffEditorPage />} />
                                <Route path="/tariffs/:id" element={<TariffEditorPage />} />
                                <Route path="/tariffs/upload" element={<TariffBatchUpload />} />
                                <Route path="/tariffs/review" element={<TariffBatchReview />} />
                                <Route path="/contracts" element={<ContractList />} />
                                <Route path="/contracts/new" element={<ContractForm />} />
                            </Routes>
                        </MainLayout>
                    </PrivateRoute>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default App
