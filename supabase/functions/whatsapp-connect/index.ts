// deno-lint-ignore-file

/**
 * whatsapp-connect — Meta Embedded Signup OAuth handler
 *
 * Required environment variables:
 *
 * Backend (Supabase secrets — never exposed to frontend):
 *   META_APP_ID     — App ID of your Meta/Facebook application
 *   META_APP_SECRET — App Secret of your Meta/Facebook application
 *
 * Frontend (.env):
 *   VITE_META_APP_ID                    — Same App ID (public, safe to expose)
 *   VITE_META_EMBEDDED_SIGNUP_CONFIG_ID — Embedded Signup configuration ID from Meta Developer Portal
 *
 * POST  → receives { code, phone_number_id, waba_id } from frontend after FB.login()
 *          exchanges code → token, fetches phone details, upserts into company_whatsapp_config
 * DELETE → removes the company's WhatsApp config (disconnects)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"

const META_GRAPH_URL = "https://graph.facebook.com/v18.0"

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    try {
        // Authenticate caller
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) return new Response(JSON.stringify({ error: "Authorization required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401
        })

        const token = authHeader.replace("Bearer ", "")
        const supabaseAuth = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401
        })

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        )

        // Get caller's company_id and role
        const { data: callerUser } = await supabaseAdmin
            .from("users")
            .select("company_id, role")
            .eq("id", user.id)
            .single()

        if (!callerUser?.company_id) return new Response(JSON.stringify({ error: "No company found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403
        })
        if (!["admin", "manager"].includes(callerUser.role)) return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403
        })

        const companyId = callerUser.company_id

        // DELETE: disconnect WhatsApp
        if (req.method === "DELETE") {
            await supabaseAdmin.from("company_whatsapp_config").delete().eq("company_id", companyId)
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
            })
        }

        // POST: connect WhatsApp
        if (req.method === "POST") {
            const { code, phone_number_id, waba_id } = await req.json()
            if (!code || !phone_number_id) return new Response(JSON.stringify({ error: "Missing code or phone_number_id" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
            })

            const appId = Deno.env.get("META_APP_ID") ?? ""
            const appSecret = Deno.env.get("META_APP_SECRET") ?? ""

            // 1. Exchange code for short-lived token
            const tokenRes = await fetch(
                `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`,
                { method: "GET" }
            )
            const tokenData = await tokenRes.json()
            if (!tokenRes.ok || !tokenData.access_token) {
                console.error("Token exchange error:", JSON.stringify(tokenData))
                throw new Error("Error al intercambiar el código de Meta. Inténtalo de nuevo.")
            }

            // 2. Extend to long-lived token (60 days)
            const extendRes = await fetch(
                `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`,
                { method: "GET" }
            )
            const extendData = await extendRes.json()
            const accessToken = extendRes.ok && extendData.access_token ? extendData.access_token : tokenData.access_token

            // 3. Fetch phone number details
            const phoneRes = await fetch(
                `${META_GRAPH_URL}/${phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${accessToken}`
            )
            const phoneData = await phoneRes.json()
            const qualityRating = phoneData.quality_rating?.quality_score ?? "GREEN"

            // 4. Upsert config
            const { error: upsertError } = await supabaseAdmin
                .from("company_whatsapp_config")
                .upsert({
                    company_id: companyId,
                    access_token: accessToken,
                    phone_number_id: phone_number_id,
                    waba_id: waba_id ?? null,
                    verified_name: phoneData.verified_name ?? null,
                    display_phone_number: phoneData.display_phone_number ?? null,
                    quality_rating: qualityRating,
                    updated_at: new Date().toISOString()
                }, { onConflict: "company_id" })

            if (upsertError) throw new Error(`Error guardando configuración: ${upsertError.message}`)

            return new Response(JSON.stringify({
                success: true,
                verified_name: phoneData.verified_name,
                display_phone_number: phoneData.display_phone_number,
                quality_rating: qualityRating
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
        }

        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405
        })

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        console.error("whatsapp-connect error:", msg)
        return new Response(JSON.stringify({ error: msg }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
        })
    }
})
