import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, ChevronDown } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Plan, PlanTier } from '@/shared/types'
import { PlanBadge } from '../components/PlanBadge'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string
  name: string
  cif: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_interval: string | null
  plan_expires_at: string | null
  plan_id: string | null
  plans: {
    name: string
    display_name: string
  } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Change Plan Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface ChangePlanDialogProps {
  company: CompanyRow
  plans: Plan[]
  onClose: () => void
  onSaved: () => void
}

function ChangePlanDialog({ company, plans, onClose, onSaved }: ChangePlanDialogProps) {
  const { toast } = useToast()
  const [selectedPlanId, setSelectedPlanId] = useState(company.plan_id ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedPlanId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({ plan_id: selectedPlanId })
        .eq('id', company.id)
      if (error) throw error
      toast({ title: 'Plan actualizado', description: `El plan de ${company.name} se ha actualizado.` })
      onSaved()
      onClose()
    } catch (err) {
      toast({
        title: 'Error al actualizar el plan',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dialog */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 40px 0 rgb(0 0 0 / 0.18)',
          width: '100%',
          maxWidth: '440px',
          padding: '28px',
        }}
      >
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          Cambiar plan
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 24px' }}>
          <strong>{company.name}</strong> &mdash; {company.cif}
        </p>

        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
          Nuevo plan
        </label>
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <select
            value={selectedPlanId}
            onChange={e => setSelectedPlanId(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 36px 0 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.875rem',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Seleccionar plan...</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!selectedPlanId || saving}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: !selectedPlanId || saving ? 'not-allowed' : 'pointer',
              opacity: !selectedPlanId || saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: '140px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)',
      }}
    >
      <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 8px', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminPlansPage() {
  const queryClient = useQueryClient()
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null)
  const [search, setSearch] = useState('')

  // Fetch all plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('sort_order')
      return (data ?? []) as Plan[]
    },
    staleTime: 10 * 60 * 1000,
  })

  // Fetch all companies with plan join
  const { data: companies = [], isLoading } = useQuery<CompanyRow[]>({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, cif, stripe_customer_id, stripe_subscription_id, billing_interval, plan_expires_at, plan_id, plans(name, display_name)')
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as CompanyRow[]
    },
    staleTime: 2 * 60 * 1000,
  })

  // Stats
  const tierCounts = companies.reduce<Record<PlanTier, number>>(
    (acc, c) => {
      const t = (c.plans?.name ?? 'free') as PlanTier
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    },
    { free: 0, standard: 0, professional: 0, early_adopter: 0 },
  )

  const filtered = companies.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cif.toLowerCase().includes(search.toLowerCase()),
  )

  function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── HEADER ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Building2 size={22} color="#2563eb" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Gestión de planes
          </h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Todas las empresas registradas y sus suscripciones activas
        </p>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <StatCard label="Empresas totales" value={companies.length} color="#0f172a" />
        <StatCard label="Plan Gratis" value={tierCounts.free} color="#475569" />
        <StatCard label="Plan Estándar" value={tierCounts.standard} color="#1d4ed8" />
        <StatCard label="Plan Profesional" value={tierCounts.professional} color="#7c3aed" />
        <StatCard label="Early Adopter" value={tierCounts.early_adopter} color="#a16207" />
      </div>

      {/* ── TABLE ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={17} color="#64748b" />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Empresas
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {companies.length}
            </span>
          </div>
          <input
            type="text"
            placeholder="Buscar empresa o CIF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.875rem',
              color: '#0f172a',
              background: '#ffffff',
              minWidth: '220px',
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)',
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Cargando empresas...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No se encontraron empresas
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Empresa', 'Plan', 'Stripe ID', 'Facturación', 'Expira', 'Acciones'].map(col => (
                      <th
                        key={col}
                        style={{
                          padding: '11px 16px',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#64748b',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((company, idx) => {
                    const planTier = (company.plans?.name ?? 'free') as PlanTier
                    return (
                      <tr
                        key={company.id}
                        style={{
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {/* Empresa */}
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#0f172a' }}>{company.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{company.cif}</p>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '12px 16px' }}>
                          <PlanBadge tier={planTier} size="sm" />
                        </td>

                        {/* Stripe ID */}
                        <td style={{ padding: '12px 16px' }}>
                          {company.stripe_customer_id ? (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {company.stripe_customer_id.slice(0, 12)}…
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>

                        {/* Billing interval */}
                        <td style={{ padding: '12px 16px' }}>
                          {company.billing_interval ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#374151',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              {company.billing_interval === 'yearly' ? 'Anual' : 'Mensual'}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>

                        {/* Expires */}
                        <td style={{ padding: '12px 16px' }}>
                          {company.plan_expires_at ? (
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                color: new Date(company.plan_expires_at) < new Date() ? '#ef4444' : '#374151',
                              }}
                            >
                              {formatDateShort(company.plan_expires_at)}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setEditingCompany(company)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#374151',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cambiar plan
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── DIALOG ── */}
      {editingCompany && (
        <ChangePlanDialog
          company={editingCompany}
          plans={plans}
          onClose={() => setEditingCompany(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
