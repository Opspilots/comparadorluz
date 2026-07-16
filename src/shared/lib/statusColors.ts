/**
 * Utilidad compartida para chips de estado en el área logueada.
 *
 * Reutiliza la clase `.status-chip` + variantes definidas en `src/index.css`
 * (~L351-383) en vez de que cada componente reimplemente su propio
 * `badgeStyle()`/`getStatusBadge()` con hex hardcodeado.
 *
 * Decisiones de mapeo no obvias (documentadas también en Engram):
 * - "contactado" (estado de cliente en CustomerList) no encajaba en ninguna
 *   de las 4 variantes existentes (success/inactive/pending/danger). Se
 *   añadió una variante nueva `.status-purple` en index.css conservando el
 *   morado #f3e8ff/#7e22ce que ya se usaba, en vez de forzarlo a "pending"
 *   o "inactive" y perder la distinción visual de ese estado intermedio.
 * - "signed" (contratos) y "validated" (eventos de comisión) tampoco tenían
 *   un color semántico afín: se añadió `.status-info` (azul), reutilizando
 *   los tokens de marca ya existentes `--primary-light` / `--color-primary-hover`
 *   en vez de introducir un hex nuevo.
 * - Tarifas "inactiva" y reglas de comisión "inactiva" se mapean a
 *   `status-danger` (rojo) en lugar de `status-inactive` (gris neutro),
 *   porque semánticamente señalan una versión/regla caducada o desactivada
 *   que ya no debe usarse — no un simple estado neutro. Esto preserva el
 *   rojo que TariffTableRow y CommissionRulesTab ya usaban antes del refactor.
 */

export type StatusChipVariant = 'active' | 'inactive' | 'pending' | 'danger' | 'info' | 'purple'

const STATUS_VARIANT_MAP: Record<string, StatusChipVariant> = {
    // Contratos (ContractList) — Contract['status']
    pending: 'pending',
    signed: 'info',
    active: 'active',
    cancelled: 'danger',
    completed: 'active',

    // Liquidaciones (CommissionerPayoutsTab) y eventos de comisión
    draft: 'inactive',
    finalized: 'pending',
    paid: 'active',
    validated: 'info',
    reverted: 'danger',

    // Clientes (CustomerList) — Customer['status']
    prospecto: 'inactive',
    contactado: 'purple',
    propuesta: 'info',
    negociacion: 'pending',
    cliente: 'active',
    perdido: 'danger',

    // Genérico activo/inactivo en español (tarifas, reglas de comisión)
    activo: 'active',
    activa: 'active',
    inactivo: 'danger',
    inactiva: 'danger',
}

/** Resuelve la variante visual para un valor de estado (string) conocido. */
export function getStatusVariant(status: string): StatusChipVariant {
    return STATUS_VARIANT_MAP[status] ?? 'inactive'
}

/** Devuelve las clases CSS (`status-chip status-<variante>`) para un estado string. */
export function getStatusChipClass(status: string): string {
    return `status-chip status-${getStatusVariant(status)}`
}

/**
 * Variante para flags booleanos is_active (tarifas, reglas de comisión).
 * Por defecto: activo -> verde, inactivo -> rojo (ver nota de mapeo arriba).
 */
export function getBooleanStatusChipClass(
    isActive: boolean,
    opts?: { activeVariant?: StatusChipVariant; inactiveVariant?: StatusChipVariant }
): string {
    const variant = isActive
        ? (opts?.activeVariant ?? 'active')
        : (opts?.inactiveVariant ?? 'danger')
    return `status-chip status-${variant}`
}
