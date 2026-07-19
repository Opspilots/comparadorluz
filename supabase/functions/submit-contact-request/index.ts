// deno-lint-ignore-file

/**
 * submit-contact-request — public landing page contact form handler
 *
 * The landing contact form used to insert straight into `contact_requests`
 * from the browser (anon role, policy WITH CHECK (true)). With no server hop
 * there was no way to throttle by submission frequency — only DB-level length
 * constraints bounded abuse. This function moves the insert server-side so we
 * can apply the shared IP-based rate limiter and reject oversized payloads
 * before touching the database.
 *
 * Public endpoint: no Authorization/JWT of a real user is required. The insert
 * runs with the service_role key, so the anon INSERT policy on
 * `contact_requests` is removed in migration 20260719000001.
 *
 * POST → { nombre, email, empresa?, mensaje } → inserts one contact request.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts"

// Field bounds — must stay in sync with the CHECK constraints in
// 20260719000000_contact_requests_length_constraints.sql
const LIMITS = {
    nombre: { min: 1, max: 120 },
    email: { min: 3, max: 200 },
    empresa: { max: 160 },
    mensaje: { min: 1, max: 4000 },
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
    return new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
    })
}

/**
 * Derive a stable UUID from the client IP so it fits the existing
 * `rate_limits.company_id UUID NOT NULL` column without a schema change.
 * SHA-256(ip) → first 16 bytes formatted as a UUID. Deterministic per IP,
 * scoped further by the distinct `action` value so there is no collision with
 * real company_id buckets.
 */
async function ipToUuid(ip: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))
    const bytes = new Uint8Array(digest).slice(0, 16)
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim()
        if (first) return first
    }
    return req.headers.get("x-real-ip")?.trim() || "0.0.0.0"
}

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    if (req.method !== "POST") {
        return jsonResponse({ error: "Método no permitido." }, 405, corsHeaders)
    }

    try {
        // Rate limit by client IP: 5 submissions per 10 minutes.
        const clientIp = getClientIp(req)
        const rl = await checkRateLimit({
            action: "submit-contact-request",
            companyId: await ipToUuid(clientIp),
            maxRequests: 5,
            windowSeconds: 600,
        })
        if (!rl.allowed) return rateLimitResponse(rl, corsHeaders)

        // Parse body
        let payload: Record<string, unknown>
        try {
            payload = await req.json()
        } catch {
            return jsonResponse({ error: "Cuerpo de la petición inválido." }, 400, corsHeaders)
        }

        const nombre = typeof payload.nombre === "string" ? payload.nombre.trim() : ""
        const email = typeof payload.email === "string" ? payload.email.trim() : ""
        const empresaRaw = typeof payload.empresa === "string" ? payload.empresa.trim() : ""
        const empresa = empresaRaw.length > 0 ? empresaRaw : null
        const mensaje = typeof payload.mensaje === "string" ? payload.mensaje.trim() : ""

        // Validate lengths (mirrors DB constraints) — fail before touching the DB.
        if (nombre.length < LIMITS.nombre.min || nombre.length > LIMITS.nombre.max) {
            return jsonResponse({ error: "El nombre es obligatorio y no puede superar los 120 caracteres." }, 400, corsHeaders)
        }
        if (email.length < LIMITS.email.min || email.length > LIMITS.email.max || !EMAIL_REGEX.test(email)) {
            return jsonResponse({ error: "Introduce un email válido (máximo 200 caracteres)." }, 400, corsHeaders)
        }
        if (empresa !== null && empresa.length > LIMITS.empresa.max) {
            return jsonResponse({ error: "El nombre de la empresa no puede superar los 160 caracteres." }, 400, corsHeaders)
        }
        if (mensaje.length < LIMITS.mensaje.min || mensaje.length > LIMITS.mensaje.max) {
            return jsonResponse({ error: "El mensaje es obligatorio y no puede superar los 4000 caracteres." }, 400, corsHeaders)
        }

        // Insert with service role — the anon INSERT policy no longer exists.
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        )

        const { error: insertError } = await supabaseAdmin
            .from("contact_requests")
            .insert({ nombre, email, empresa, mensaje })

        if (insertError) {
            console.error("submit-contact-request insert error:", insertError.message)
            return jsonResponse({ error: "No se pudo enviar el mensaje. Inténtalo de nuevo." }, 500, corsHeaders)
        }

        return jsonResponse({ success: true }, 200, corsHeaders)
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        console.error("submit-contact-request error:", msg)
        return jsonResponse({ error: "No se pudo enviar el mensaje. Inténtalo de nuevo." }, 500, corsHeaders)
    }
})
