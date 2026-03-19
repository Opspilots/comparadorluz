import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { MainLayout } from '@/shared/components/layout/MainLayout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/shared/components/ui/toaster'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { Login } from '@/features/auth/components/Login'
import { ConsentSignPage } from '@/features/compliance/pages/ConsentSignPage'

// Lazy-loaded route components (code splitting)
const TariffDashboard = lazy(() => import('@/features/tariffs/pages/TariffDashboard'))
const TariffEditorPage = lazy(() => import('@/features/tariffs/pages/TariffEditorPage').then(m => ({ default: m.TariffEditorPage })))
const TariffDetailsPage = lazy(() => import('@/features/tariffs/pages/TariffDetailsPage'))
const TariffUploadPage = lazy(() => import('@/features/tariffs/pages/TariffUploadPage'))
const BatchDetailsPage = lazy(() => import('@/features/tariffs/pages/BatchDetailsPage'))
const MessagingLayout = lazy(() => import('@/features/messaging/layouts/MessagingLayout'))
const MessagingPage = lazy(() => import('@/features/messaging/pages/MessagingPage'))
const ConversationPage = lazy(() => import('@/features/messaging/pages/ConversationPage'))
const SettingsPage = lazy(() => import('@/features/auth/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const GoogleOAuthCallbackPage = lazy(() => import('@/features/auth/pages/GoogleOAuthCallbackPage').then(m => ({ default: m.GoogleOAuthCallbackPage })))
const CustomerList = lazy(() => import('@/features/crm/components/CustomerList').then(m => ({ default: m.CustomerList })))
const CustomerDetails = lazy(() => import('@/features/crm/components/CustomerDetails').then(m => ({ default: m.CustomerDetails })))
const ComparatorForm = lazy(() => import('@/features/comparator/components/ComparatorForm').then(m => ({ default: m.ComparatorForm })))
const ComparisonHistory = lazy(() => import('@/features/comparator/pages/ComparisonHistory').then(m => ({ default: m.ComparisonHistory })))
const ContactForm = lazy(() => import('@/features/crm/components/ContactForm').then(m => ({ default: m.ContactForm })))
const SupplyPointForm = lazy(() => import('@/features/crm/components/SupplyPointForm').then(m => ({ default: m.SupplyPointForm })))
const CustomerForm = lazy(() => import('@/features/crm/components/CustomerForm').then(m => ({ default: m.CustomerForm })))
const CampaignsPage = lazy(() => import('@/features/messaging/pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const CampaignForm = lazy(() => import('@/features/messaging/pages/CampaignForm').then(m => ({ default: m.CampaignForm })))
const ContractList = lazy(() => import('@/features/contracts/components/ContractList').then(m => ({ default: m.ContractList })))
const ContractForm = lazy(() => import('@/features/contracts/components/ContractForm').then(m => ({ default: m.ContractForm })))
const ContractPreview = lazy(() => import('@/features/contracts/components/ContractPreview').then(m => ({ default: m.ContractPreview })))
const ContractTemplateEditor = lazy(() => import('@/features/contracts/components/ContractTemplateEditor').then(m => ({ default: m.ContractTemplateEditor })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const CommissionersPage = lazy(() => import('@/features/commissioners/pages/CommissionersPage').then(m => ({ default: m.CommissionersPage })))
const CommissionerDetailPage = lazy(() => import('@/features/commissioners/pages/CommissionerDetailPage').then(m => ({ default: m.CommissionerDetailPage })))
const SuppliersPage = lazy(() => import('@/features/tariffs/pages/SuppliersPage'))
const CompliancePage = lazy(() => import('@/features/compliance/pages/CompliancePage').then(m => ({ default: m.CompliancePage })))

function PrivateRoute({ children }: { children: JSX.Element }) {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const initSession = async (s: Session | null) => {
            if (s?.user) {
                // Check if user has a profile in public.users
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', s.user.id)
                    .maybeSingle()

                if (cancelled) return

                if (!profile) {
                    // First-time OAuth user — create company + profile
                    const email = s.user.email || ''
                    const companyName = `Empresa de ${email.split('@')[0]}`
                    const randomCif = `A${Math.floor(Math.random() * 90000000 + 10000000)}`

                    const { error: rpcError } = await supabase.rpc('create_company_with_user', {
                        p_user_id: s.user.id,
                        p_email: email,
                        p_company_name: companyName,
                        p_cif: randomCif,
                    })

                    if (cancelled) return

                    if (rpcError) {
                        console.error('Error creating user profile:', rpcError)
                        await supabase.auth.signOut()
                        if (cancelled) return
                        setSession(null)
                        setLoading(false)
                        return
                    }
                }
            }
            if (cancelled) return
            setSession(s)
            setLoading(false)
        }

        // Use only onAuthStateChange — it fires INITIAL_SESSION on mount.
        // Calling getSession() separately causes a race that can double-fire initSession.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            initSession(session)
        })

        return () => {
            cancelled = true
            subscription.unsubscribe()
        }
    }, [])

    if (loading) return <div>Cargando...</div>
    if (!session) return <Navigate to="/login" />

    return children
}

function AdminRoute({ children }: { children: JSX.Element }) {
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const checkRole = async () => {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    setRole(data?.role || null)
                } else {
                    setAuthError(true)
                }
            } catch {
                setAuthError(true)
            }
            setLoading(false)
        }
        checkRole()
    }, [location.pathname])

    if (loading) return <div>Cargando...</div>
    if (authError) return <Navigate to="/login" />
    if (role !== 'admin' && role !== 'manager') return <Navigate to="/" />

    return children
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

const LoadingFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#64748b' }}>
        Cargando...
    </div>
)

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/consent/sign/:token" element={<ConsentSignPage />} />
                        <Route path="/*" element={
                            <PrivateRoute>
                                <MainLayout>
                                    <Routes>
                                        <Route path="/" element={<DashboardPage />} />
                                        <Route path="/comparator" element={<ComparatorForm />} />
                                        <Route path="/comparator/history" element={<ComparisonHistory />} />
                                        <Route path="/settings" element={<SettingsPage />} />
                                        <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
                                        <Route path="/crm" element={<CustomerList />} />
                                        <Route path="/crm/new" element={<CustomerForm />} />
                                        <Route path="/crm/:id" element={<CustomerDetails />} />
                                        <Route path="/crm/:id/edit" element={<CustomerForm />} />
                                        <Route path="/crm/:customerId/contacts/new" element={<ContactForm />} />
                                        <Route path="/crm/:customerId/supply-points/new" element={<SupplyPointForm />} />
                                        <Route path="/commissioners" element={<CommissionersPage />} />
                                        <Route path="/commissioners/:id" element={<CommissionerDetailPage />} />

                                        {/* Tariffs — admin/manager only */}
                                        <Route path="/admin/tariffs" element={<AdminRoute><TariffDashboard /></AdminRoute>} />
                                        <Route path="/admin/tariffs/upload" element={<AdminRoute><TariffUploadPage /></AdminRoute>} />
                                        <Route path="/admin/tariffs/batches/:id" element={<AdminRoute><BatchDetailsPage /></AdminRoute>} />
                                        <Route path="/admin/tariffs/new" element={<AdminRoute><TariffEditorPage /></AdminRoute>} />
                                        <Route path="/admin/tariffs/:id" element={<AdminRoute><TariffDetailsPage /></AdminRoute>} />
                                        <Route path="/admin/tariffs/edit/:id" element={<AdminRoute><TariffEditorPage /></AdminRoute>} />
                                        <Route path="/admin/suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
                                        <Route path="/admin/compliance" element={<AdminRoute><CompliancePage /></AdminRoute>} />

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
                                        <Route path="/contracts/template" element={<AdminRoute><ContractTemplateEditor /></AdminRoute>} />
                                        <Route path="/contracts/new" element={<ContractForm />} />
                                        <Route path="/contracts/:id" element={<ContractForm />} />
                                        <Route path="/contracts/:id/view" element={<ContractPreview />} />
                                    </Routes>
                                </MainLayout>
                            </PrivateRoute>
                        } />
                    </Routes>
                </Suspense>
                </ErrorBoundary>
                <Toaster />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
