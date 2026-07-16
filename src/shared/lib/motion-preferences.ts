/**
 * Devuelve true si el usuario ha activado "reducir movimiento" en su sistema operativo.
 * Usar antes de disparar animaciones GSAP/CSS no esenciales (WCAG 2.2 — 2.3.3 Animation from Interactions).
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
