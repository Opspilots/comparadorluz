import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { MainLayout } from '@/shared/components/layout/MainLayout'
import TariffDashboard from '@/features/tariffs/pages/TariffDashboard'

import { TariffEditorPage } from '@/features/tariffs/pages/TariffEditorPage'
import TariffDetailsPage from '@/features/tariffs/pages/TariffDetailsPage'
import TariffUploadPage from '@/features/tariffs/pages/TariffUploadPage'
import BatchDetailsPage from '@/features/tariffs/pages/BatchDetailsPage'
import MessagingLayout from '@/features/messaging/layouts/MessagingLayout'
import MessagingPage from '@/features/messaging/pages/MessagingPage'
import ConversationPage from '@/features/messaging/pages/ConversationPage'
import { Login } from '@/features/auth/components/Login'
import { SettingsPage } from '@/features/auth/pages/SettingsPage'
import { CustomerList } from '@/features/crm/components/CustomerList'
import { CustomerDetails } from '@/features/crm/components/CustomerDetails'
import { ComparatorForm } from '@/features/comparator/components/ComparatorForm'
import { ComparisonHistory } from '@/features/comparator/pages/ComparisonHistory'
import { ContactForm } from '@/features/crm/components/ContactForm'
import { SupplyPointForm } from '@/features/crm/components/SupplyPointForm'

import { CustomerForm } from '@/features/crm/components/CustomerForm'
import { CampaignsPage } from '@/features/messaging/pages/CampaignsPage'
import { CampaignForm } from '@/features/messaging/pages/CampaignForm'
import { ContractList } from '@/features/contracts/components/ContractList'
import { ContractForm } from '@/features/contracts/components/ContractForm'
import { ContractPreview } from '@/features/contracts/components/ContractPreview'
import { ContractTemplateEditor } from '@/features/contracts/components/ContractTemplateEditor'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { CommissionersPage } from '@/features/commissioners/pages/CommissionersPage'
import { CommissionerDetailPage } from '@/features/commissioners/pages/CommissionerDetailPage'
import SuppliersPage from '@/features/tariffs/pages/SuppliersPage'

function PrivateRoute({ children }: { children: JSX.Element }) {
    const [session, setSession] = useState<Session | null>(null)
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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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


                                    {/* Tariffs */}
                                    <Route path="/admin/tariffs" element={<TariffDashboard />} />
                                    <Route path="/admin/tariffs/upload" element={<TariffUploadPage />} />
                                    <Route path="/admin/tariffs/batches/:id" element={<BatchDetailsPage />} />
                                    <Route path="/admin/tariffs/:id" element={<TariffDetailsPage />} />
                                    <Route path="/admin/tariffs/new" element={<TariffEditorPage />} />
                                    <Route path="/admin/tariffs/edit/:id" element={<TariffEditorPage />} />
                                    <Route path="/admin/suppliers" element={<SuppliersPage />} />

                                    {/* Messaging */}
                                    <Route path="/admin/messages" element={<MessagingLayout />}>
                                        <Route index element={<MessagingPage />} />
                                        <Route path="campaigns" element={<CampaignsPage />} />
                                        <Route path="campaigns/new" element={<CampaignForm />} />
                                        <Route path="campaigns/:id" element={<CampaignForm />} />
                                        <Route path="campaigns/:id/edit" element={<CampaignForm />} />
                                        <Route path=":customerId" element={<ConversationPage />} />
                                    </Route>
                                    <Route path="/contracts" element={<ContractList />} />
                                    <Route path="/contracts/template" element={<ContractTemplateEditor />} />
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
