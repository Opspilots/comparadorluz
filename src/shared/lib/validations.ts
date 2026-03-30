import { z } from 'zod'

// ============================================================================
// Spanish Business Validations
// ============================================================================

/**
 * Validates a Spanish CIF/NIF/NIE format.
 * CIF: Letter + 7 digits + control (A12345678)
 * NIF: 8 digits + letter (12345678A)
 * NIE: X/Y/Z + 7 digits + letter (X1234567A)
 */
const CIF_NIF_REGEX = /^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$|^[A-Z][0-9]{7}[0-9A-Z]$/

/**
 * CUPS: Universal Supply Point Code (20-22 chars, starts with ES)
 */
const CUPS_REGEX = /^ES\d{16}[A-Z]{0,2}$/i

// ============================================================================
// Reusable Field Schemas
// ============================================================================

export const cifField = z
  .string()
  .min(1, 'El CIF/NIF es obligatorio')
  .regex(CIF_NIF_REGEX, 'Formato de CIF/NIF no válido (ej: A12345678, 12345678A, X1234567A)')

export const cupsField = z
  .string()
  .min(20, 'El CUPS debe tener al menos 20 caracteres')
  .max(22, 'El CUPS no puede tener más de 22 caracteres')
  .regex(CUPS_REGEX, 'Formato CUPS no válido (debe empezar por ES seguido de 16 dígitos)')

export const emailField = z
  .string()
  .email('Email no válido')
  .or(z.literal(''))

export const phoneField = z
  .string()
  .regex(/^[+]?[\d\s()-]{6,20}$/, 'Teléfono no válido')
  .or(z.literal(''))

export const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} es obligatorio`)

export const positiveNumber = (fieldName: string) =>
  z.number()
    .positive(`${fieldName} debe ser mayor que 0`)

export const percentageField = z
  .number()
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede superar 100')

// ============================================================================
// Form Schemas
// ============================================================================

export const customerSchema = z.object({
  cif: cifField,
  name: requiredString('Razón social'),
  customerType: z.enum(['empresa', 'particular']),
  status: z.enum([
    'prospecto', 'contactado', 'propuesta', 'negociacion', 'cliente', 'perdido'
  ]),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
})

export const contactSchema = z.object({
  firstName: requiredString('Nombre'),
  lastName: requiredString('Apellidos'),
  email: emailField.optional(),
  phone: phoneField.optional(),
  position: z.string().optional(),
  isPrimary: z.boolean().default(false),
})

export const supplyPointSchema = z.object({
  cups: cupsField,
  address: requiredString('Dirección'),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  tariffType: z.enum(['2.0TD', '3.0TD', '6.1TD', '6.2']),
  contractedPower: positiveNumber('Potencia contratada').optional(),
  annualConsumption: positiveNumber('Consumo anual').optional(),
})

export const contractSchema = z.object({
  customerId: z.string().uuid('Selecciona un cliente'),
  tariffVersionId: z.string().uuid('Selecciona una tarifa'),
  commercialId: z.string().uuid().optional().nullable(),
  supplyPointId: z.string().uuid().optional().nullable(),
  manualCups: z.string().optional(),
  monthlyValue: z.number().optional(),
  signedAt: z.string().min(1, 'La fecha de firma es obligatoria'),
  notes: z.string().optional(),
  originSupplierName: z.string().optional(),
  originTariffName: z.string().optional(),
  originAnnualCost: z.number().optional(),
  commissionEur: z.number().min(0).optional(),
})

export const commissionerSchema = z.object({
  fullName: requiredString('Nombre completo'),
  email: emailField.optional(),
  phone: phoneField.optional(),
  nif: z.string().regex(CIF_NIF_REGEX, 'NIF no válido').or(z.literal('')).optional(),
  address: z.string().optional(),
  commissionPct: percentageField,
})

export const commissionRuleSchema = z.object({
  commissionerId: z.string().uuid('Selecciona un comercial'),
  supplierName: z.string().optional(),
  tariffType: z.string().optional(),
  percentage: percentageField,
  validFrom: z.string().min(1, 'La fecha es obligatoria'),
})

export const campaignSchema = z.object({
  name: requiredString('Nombre de la campaña'),
  channel: z.enum(['email', 'whatsapp']),
  subject: z.string().optional(),
  body: requiredString('Contenido del mensaje'),
  scheduledAt: z.string().optional(),
  customerType: z.enum(['all', 'empresa', 'particular']).default('all'),
  customerStatus: z.enum([
    'all', 'prospecto', 'contactado', 'propuesta', 'negociacion', 'cliente', 'perdido'
  ]).default('all'),
}).refine(
  (data) => data.channel !== 'email' || (data.subject && data.subject.length > 0),
  { message: 'El asunto es obligatorio para emails', path: ['subject'] }
)

export const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const signupSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
})

// ============================================================================
// Helper: extract first error message from a Zod result
// ============================================================================

export function getFirstZodError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  if (result.success || !result.error) return null
  const issues = result.error.issues
  return issues.length > 0 ? issues[0].message : 'Error de validación'
}

// ============================================================================
// Type exports (infer from schemas)
// ============================================================================

export type CustomerFormData = z.infer<typeof customerSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type SupplyPointFormData = z.infer<typeof supplyPointSchema>
export type ContractFormData = z.infer<typeof contractSchema>
export type CommissionerFormData = z.infer<typeof commissionerSchema>
export type CommissionRuleFormData = z.infer<typeof commissionRuleSchema>
export type CampaignFormData = z.infer<typeof campaignSchema>
export type LoginFormData = z.infer<typeof loginSchema>
