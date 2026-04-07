import type { PlanTier, PlanLimits, PlanFeatures } from '@/shared/types'

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    max_users: 1,
    max_supply_points: 10,
    ai_uses_per_month: 0,
    comparisons_per_month: 5,
    messages_per_month: 0,
    max_customers: 10,
  },
  standard: {
    max_users: 5,
    max_supply_points: 50,
    ai_uses_per_month: 100,
    comparisons_per_month: -1,
    messages_per_month: 500,
    max_customers: -1,
  },
  professional: {
    max_users: -1,
    max_supply_points: -1,
    ai_uses_per_month: -1,
    comparisons_per_month: -1,
    messages_per_month: -1,
    max_customers: -1,
  },
  early_adopter: {
    max_users: -1,
    max_supply_points: -1,
    ai_uses_per_month: -1,
    comparisons_per_month: -1,
    messages_per_month: -1,
    max_customers: -1,
  },
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    crm: true,
    comparator: true,
    messaging: false,
    commissioners: false,
    compliance: false,
    pdf_reports: false,
    api_access: false,
    advanced_analytics: false,
    tariff_upload: false,
  },
  standard: {
    crm: true,
    comparator: true,
    messaging: true,
    commissioners: true,
    compliance: true,
    pdf_reports: true,
    api_access: false,
    advanced_analytics: false,
    tariff_upload: true,
  },
  professional: {
    crm: true,
    comparator: true,
    messaging: true,
    commissioners: true,
    compliance: true,
    pdf_reports: true,
    api_access: true,
    advanced_analytics: true,
    tariff_upload: true,
  },
  early_adopter: {
    crm: true,
    comparator: true,
    messaging: true,
    commissioners: true,
    compliance: true,
    pdf_reports: true,
    api_access: true,
    advanced_analytics: true,
    tariff_upload: true,
  },
}

export const PLAN_COLORS: Record<PlanTier, { bg: string; text: string; border: string }> = {
  free: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  standard: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  professional: { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  early_adopter: { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
}

export const PLAN_DISPLAY: Record<PlanTier, string> = {
  free: 'Gratis',
  standard: 'Estándar',
  professional: 'Profesional',
  early_adopter: 'Early Adopter',
}

export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  crm: 'CRM / Clientes',
  comparator: 'Comparador',
  messaging: 'Mensajería',
  commissioners: 'Comisionados',
  compliance: 'Cumplimiento RGPD',
  pdf_reports: 'Informes PDF',
  api_access: 'Acceso API',
  advanced_analytics: 'Analítica avanzada',
  tariff_upload: 'Gestión de tarifas',
}

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  max_users: 'Usuarios',
  max_supply_points: 'Puntos de suministro',
  ai_uses_per_month: 'Usos IA / mes',
  comparisons_per_month: 'Comparaciones / mes',
  messages_per_month: 'Mensajes / mes',
  max_customers: 'Clientes',
}

export const USAGE_FEATURE_KEYS: Record<string, { label: string; limitKey: keyof PlanLimits }> = {
  ai_uses: { label: 'Usos IA (OCR)', limitKey: 'ai_uses_per_month' },
  comparisons: { label: 'Comparaciones', limitKey: 'comparisons_per_month' },
  messages_sent: { label: 'Mensajes enviados', limitKey: 'messages_per_month' },
}

export function formatLimit(value: number): string {
  return value === -1 ? 'Ilimitado' : value === 0 ? 'No incluido' : value.toLocaleString('es-ES')
}

export function isUnderLimit(used: number, limit: number): boolean {
  if (limit === -1) return true  // unlimited
  if (limit === 0) return false  // not available
  return used < limit
}

export function getUsagePercent(used: number, limit: number): number {
  if (limit === -1) return 0
  if (limit === 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}
