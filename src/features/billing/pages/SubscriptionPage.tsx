import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, CreditCard, ExternalLink, BadgeCheck, AlertTriangle, Building2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Plan, PlanTier, BillingInterval } from '@/shared/types'
import { usePlan } from '../hooks/usePlan'
import { PlanBadge } from '../components/PlanBadge'
import { UsageMeter } from '../components/UsageMeter'
import {
  PLAN_DISPLAY,
  PLAN_FEATURES,
  PLAN_LIMITS,
  FEATURE_LABELS,
  LIMIT_LABELS,
  USAGE_FEATURE_KEYS,
  formatLimit,
} from '../lib/plans'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(cents: number, interval: BillingInterval): string {
  const eur = cents / 100
  const label = interval === 'yearly' ? '/ año' : '/ mes'
  return `${eur.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €${label}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval
  onChange: (v: BillingInterval) => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f1f5f9',
        borderRadius: '10px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {(['monthly', 'yearly'] as BillingInterval[]).map(interval => (
        <button
          key={interval}
          onClick={() => onChange(interval)}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.15s',
            background: value === interval ? '#ffffff' : 'transparent',
            color: value === interval ? '#0f172a' : '#64748b',
            boxShadow: value === interval ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none',
          }}
        >
          {interval === 'monthly' ? 'Mensual' : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Anual
              <span
                style={{
                  background: '#dcfce7',
                  color: '#16a34a',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                }}
              >
                −20%
              </span>
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature row inside plan card
// ─────────────────────────────────────────────────────────────────────────────

function FeatureRow({
  label,
  included,
}: {
  label: string
  included: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '5px 0',
        fontSize: '0.8125rem',
        color: included ? '#0f172a' : '#94a3b8',
      }}
    >
      {included ? (
        <Check size={15} color="#10b981" strokeWidth={2.5} />
      ) : (
        <X size={15} color="#cbd5e1" strokeWidth={2.5} />
      )}
      {label}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan comparison card
// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: Plan
  currentTier: PlanTier
  billingInterval: BillingInterval
  onCheckout: (planId: string) => Promise<void>
  loadingCheckout: string | null
}

function PlanCard({ plan, currentTier, billingInterval, onCheckout, loadingCheckout }: PlanCardProps) {
  const tier = plan.name as PlanTier
  const isCurrent = tier === currentTier
  const isPopular = tier === 'standard'
  const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly
  const hasStripe =
    billingInterval === 'yearly'
      ? !!plan.stripe_price_yearly_id
      : !!plan.stripe_price_monthly_id

  const tierColors: Record<PlanTier, { accent: string; header: string }> = {
    free: { accent: '#64748b', header: '#f8fafc' },
    standard: { accent: '#2563eb', header: '#eff6ff' },
    professional: { accent: '#7c3aed', header: '#faf5ff' },
    early_adopter: { accent: '#a16207', header: '#fefce8' },
  }
  const colors = tierColors[tier]

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        border: `1px solid ${isCurrent ? colors.accent : '#e2e8f0'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: isCurrent
          ? `0 0 0 2px ${colors.accent}22, 0 4px 12px 0 rgb(0 0 0 / 0.08)`
          : '0 1px 3px 0 rgb(0 0 0 / 0.07)',
        position: 'relative',
      }}
    >
      {isPopular && !isCurrent && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: '#2563eb',
            color: '#ffffff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '999px',
            letterSpacing: '0.03em',
          }}
        >
          MÁS POPULAR
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: '24px 24px 20px',
          background: colors.header,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <PlanBadge tier={tier} />
          {isCurrent && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: colors.accent,
                background: `${colors.accent}14`,
                border: `1px solid ${colors.accent}33`,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              <BadgeCheck size={12} />
              Plan actual
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          {price === 0 ? (
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Gratis</span>
          ) : (
            <>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {(price / 100).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              </span>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                / {billingInterval === 'yearly' ? 'año' : 'mes'}
              </span>
            </>
          )}
        </div>
        {billingInterval === 'yearly' && price > 0 && (
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0' }}>
            {((price / 100) / 12).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} € / mes facturado anualmente
          </p>
        )}
      </div>

      {/* Limits */}
      <div style={{ padding: '20px 24px 0' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Límites
        </p>
        {(Object.keys(PLAN_LIMITS[tier]) as (keyof typeof PLAN_LIMITS[typeof tier])[]).map(key => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              fontSize: '0.8125rem',
              borderBottom: '1px solid #f8fafc',
            }}
          >
            <span style={{ color: '#64748b' }}>{LIMIT_LABELS[key]}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {formatLimit(PLAN_LIMITS[tier][key])}
            </span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Funcionalidades
        </p>
        {(Object.keys(PLAN_FEATURES[tier]) as (keyof typeof PLAN_FEATURES[typeof tier])[]).map(key => (
          <FeatureRow
            key={key}
            label={FEATURE_LABELS[key]}
            included={PLAN_FEATURES[tier][key]}
          />
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 24px' }}>
        {isCurrent ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <BadgeCheck size={16} style={{ marginRight: '6px', color: '#10b981' }} />
            Plan activo
          </div>
        ) : hasStripe ? (
          <button
            onClick={() => void onCheckout(plan.id)}
            disabled={loadingCheckout === plan.id}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              cursor: loadingCheckout === plan.id ? 'not-allowed' : 'pointer',
              background: tier === 'professional' ? '#7c3aed' : '#2563eb',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: loadingCheckout === plan.id ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loadingCheckout === plan.id
              ? 'Redirigiendo...'
              : tier === 'free'
              ? 'Bajar a Gratis'
              : `Actualizar a ${PLAN_DISPLAY[tier]}`}
          </button>
        ) : (
          <a
            href={`mailto:ventas@energydeal.es?subject=Plan ${PLAN_DISPLAY[tier]}&body=Hola, me interesa el plan ${PLAN_DISPLAY[tier]}.`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: '#f8fafc',
            }}
          >
            Contactar ventas
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionPage() {
  const { toast } = useToast()
  const { company, plan, tier, loading, refetch } = usePlan()
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [adminPlanId, setAdminPlanId] = useState<string>('')
  const [savingAdminPlan, setSavingAdminPlan] = useState(false)

  // Fetch all plans for comparison
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('sort_order')
      return (data ?? []) as Plan[]
    },
    staleTime: 10 * 60 * 1000,
  })

  // Determine if current user is admin
  const { data: userRole } = useQuery<string | null>({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      return data?.role ?? null
    },
    staleTime: 10 * 60 * 1000,
  })

  const isAdmin = userRole === 'admin'

  const handleCheckout = async (planId: string) => {
    setLoadingCheckout(planId)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_id: planId,
          billing_interval: billingInterval,
          success_url: window.location.href + '?success=1',
          cancel_url: window.location.href,
        },
      })
      if (error) throw error
      const url = (data as { url?: string })?.url
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No se recibió la URL de pago')
      }
    } catch (err) {
      toast({
        title: 'Error al iniciar el pago',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      })
    } finally {
      setLoadingCheckout(null)
    }
  }

  const handlePortal = async () => {
    setLoadingPortal(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { return_url: window.location.href },
      })
      if (error) throw error
      const url = (data as { url?: string })?.url
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No se recibió la URL del portal')
      }
    } catch (err) {
      toast({
        title: 'Error al abrir el portal de facturación',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      })
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleAdminPlanSave = async () => {
    if (!adminPlanId || !company?.id) return
    setSavingAdminPlan(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({ plan_id: adminPlanId })
        .eq('id', company.id)
      if (error) throw error
      toast({ title: 'Plan actualizado', description: 'El plan de la empresa se ha actualizado correctamente.' })
      void refetch()
    } catch (err) {
      toast({
        title: 'Error al cambiar el plan',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      })
    } finally {
      setSavingAdminPlan(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#64748b' }}>
        Cargando suscripción...
      </div>
    )
  }

  const hasStripeSubscription = !!company?.stripe_subscription_id
  const isExpiredOrTrial = company?.trial_ends_at
    ? new Date(company.trial_ends_at) < new Date()
    : false

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Suscripción y pagos
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Gestiona tu plan, uso y facturación
          </p>
        </div>
        <PlanBadge tier={tier} />
      </div>

      {/* ── TRIAL BANNER ── */}
      {company?.trial_ends_at && !isExpiredOrTrial && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
          }}
        >
          <AlertTriangle size={18} color="#d97706" />
          <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
            <strong>Período de prueba activo.</strong> Tu prueba gratuita finaliza el{' '}
            <strong>{formatDate(company.trial_ends_at)}</strong>. Actualiza tu plan para continuar sin interrupciones.
          </p>
        </div>
      )}

      {/* ── CURRENT PLAN CARD ── */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
          Plan actual
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <PlanBadge tier={tier} />
                {!hasStripeSubscription && plan && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#64748b',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    Asignado manualmente
                  </span>
                )}
              </div>
              {plan && (
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  {billingInterval === 'yearly'
                    ? formatPrice(plan.price_yearly, 'yearly')
                    : formatPrice(plan.price_monthly, 'monthly')}
                  {company?.plan_expires_at && (
                    <> &nbsp;·&nbsp; Renueva el <strong>{formatDate(company.plan_expires_at)}</strong></>
                  )}
                </p>
              )}
            </div>
            {hasStripeSubscription && (
              <button
                onClick={() => void handlePortal()}
                disabled={loadingPortal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: loadingPortal ? 'not-allowed' : 'pointer',
                  opacity: loadingPortal ? 0.7 : 1,
                }}
              >
                <CreditCard size={15} />
                {loadingPortal ? 'Redirigiendo...' : 'Gestionar facturación →'}
              </button>
            )}
          </div>

          {/* Usage meters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {Object.entries(USAGE_FEATURE_KEYS).map(([key, { label, limitKey }]) => (
              <UsageMeter key={key} featureKey={key} limitKey={limitKey} label={label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PLAN COMPARISON ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            Comparar planes
          </h2>
          <IntervalToggle value={billingInterval} onChange={setBillingInterval} />
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {plans.filter(p => !['early_adopter'].includes(p.name)).map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              currentTier={tier}
              billingInterval={billingInterval}
              onCheckout={handleCheckout}
              loadingCheckout={loadingCheckout}
            />
          ))}
        </div>
      </section>

      {/* ── ADMIN MANUAL OVERRIDE ── */}
      {isAdmin && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            Asignación manual de plan
          </h2>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Building2 size={18} color="#64748b" />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Cambiar plan sin Stripe
              </h3>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#7c3aed',
                  background: '#faf5ff',
                  border: '1px solid #ddd6fe',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Solo administradores
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 20px' }}>
              Para clientes B2B con contrato manual. Este cambio omite el flujo de Stripe.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={adminPlanId}
                onChange={e => setAdminPlanId(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minWidth: '200px',
                }}
              >
                <option value="">Seleccionar plan...</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void handleAdminPlanSave()}
                disabled={!adminPlanId || savingAdminPlan}
                style={{
                  height: '36px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: !adminPlanId || savingAdminPlan ? 'not-allowed' : 'pointer',
                  opacity: !adminPlanId || savingAdminPlan ? 0.6 : 1,
                }}
              >
                {savingAdminPlan ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
