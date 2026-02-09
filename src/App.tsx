import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { MainLayout } from '@/shared/components/layout/MainLayout'
import TariffDashboard from '@/features/tariffs/pages/TariffDashboard'
import TariffReviewPage from '@/features/tariffs/pages/TariffReviewPage'
import { TariffEditorPage } from '@/features/tariffs/pages/TariffEditorPage'
import { Login } from '@/features/auth/components/Login'
import { SettingsPage } from '@/features/auth/pages/SettingsPage'
import { CustomerList } from '@/features/crm/components/CustomerList'
import { CustomerDetails } from '@/features/crm/components/CustomerDetails'
import { ComparatorForm } from '@/features/comparator/components/ComparatorForm'
import { ComparisonHistory } from '@/features/comparator/pages/ComparisonHistory'
import { ContactForm } from '@/features/crm/components/ContactForm'
import { SupplyPointForm } from '@/features/crm/components/SupplyPointForm'

import { CustomerForm } from '@/features/crm/components/CustomerForm'
import { ContractList } from '@/features/contracts/components/ContractList'
import { ContractForm } from '@/features/contracts/components/ContractForm'
import { ContractPreview } from '@/features/contracts/components/ContractPreview'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { CommissionersPage } from '@/features/commissioners/pages/CommissionersPage'
import { CommissionerDetailPage } from '@/features/commissioners/pages/CommissionerDetailPage'

function PrivateRoute({ children }: { children: JSX.Element }) {
    const [session, setSession] = useState<unknown>(null)
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/shared/components/ui/toaster'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/*" element={
                        <PrivateRoute>
                            <MainLayout>
                                <Routes>
                                    <Route path="/" element={<DashboardPage />} />
                                    <Route path="/comparator" element={<ComparatorForm />} />
                                    <Route path="/comparator/history" element={<ComparisonHistory />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/crm" element={<CustomerList />} />
                                    <Route path="/crm/new" element={<CustomerForm />} />
                                    <Route path="/crm/:id" element={<CustomerDetails />} />
                                    <Route path="/crm/:id/edit" element={<CustomerForm />} />
                                    <Route path="/crm/:customerId/contacts/new" element={<ContactForm />} />
                                    <Route path="/crm/:customerId/supply-points/new" element={<SupplyPointForm />} />
                                    <Route path="/commissioners" element={<CommissionersPage />} />
                                    <Route path="/commissioners/:id" element={<CommissionerDetailPage />} />
                                    <Route path="/contracts/new" element={<ContractForm />} />

                                    {/* Tariffs */}
                                    <Route path="/admin/tariffs" element={<TariffDashboard />} />
                                    <Route path="/admin/tariffs/:batchId" element={<TariffReviewPage />} />
                                    <Route path="/admin/tariffs/new" element={<TariffEditorPage />} />
                                    <Route path="/contracts" element={<ContractList />} />
                                    <Route path="/contracts/new" element={<ContractForm />} />
                                    <Route path="/contracts/:id" element={<ContractForm />} />
                                    <Route path="/contracts/:id/view" element={<ContractPreview />} />
                                </Routes>
                            </MainLayout>
                        </PrivateRoute>
                    } />
                </Routes>
                <Toaster />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
