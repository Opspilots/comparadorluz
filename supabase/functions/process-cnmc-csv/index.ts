import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts"

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Validate JWT — reject unauthenticated callers
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Role check: only admin/manager can import CNMC data
        const supabaseService = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const { data: userData } = await supabaseService
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
            return new Response(JSON.stringify({ error: 'Insufficient permissions. Admin or manager role required.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // Rate limit: max 20 CNMC CSV parses per hour per user
        const rl = await checkRateLimit({
            action: 'process-cnmc-csv',
            companyId: user.id,
            maxRequests: 20,
            windowSeconds: 3600,
        })
        if (!rl.allowed) {
            return rateLimitResponse(rl, corsHeaders)
        }

        const { csv_content } = await req.json()
        if (!csv_content) throw new Error('CSV content is required')

        // Limit CSV size to 5MB to prevent abuse
        const MAX_CSV_SIZE = 5 * 1024 * 1024
        if (typeof csv_content === 'string' && csv_content.length > MAX_CSV_SIZE) {
            return new Response(JSON.stringify({ error: 'CSV content exceeds maximum size of 5MB' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured')

        console.log("Parsing CNMC CSV with Gemini...")

        const geminiPrompt = `
            Eres un experto en el mercado eléctrico español. Analiza el siguiente contenido CSV extraído del comparador de la CNMC.
            Extrae TODAS las ofertas comerciales únicas.
            
            Reglas de extracción:
            1. Identifica el nombre de la comercializadora (Compañía).
            2. Identifica el nombre de la tarifa.
            3. Identifica el tipo de peaje (2.0TD, 3.0TD, etc).
            4. Extrae los precios de energía (€/kWh) para P1, P2, P3...
            5. Extrae los precios de potencia (€/kW/año) para P1, P2...
            6. Determina si es "Indexada" (variable según mercado).
            
            Responde EXCLUSIVAMENTE con un array JSON de objetos con esta estructura:
            {
              "supplier_name": "string",
              "tariff_name": "string",
              "tariff_type": "string",
              "is_indexed": boolean,
              "rates": [
                { "item_type": "energy" | "power", "period": "P1" | "P2"..., "price": number, "unit": "EUR/kWh" | "EUR/kW/year" }
              ]
            }

            CSV:
            ${csv_content.substring(0, 15000)}
        `

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: geminiPrompt }] }]
            })
        })

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

        const aiResult = await response.json()
        const textResponse = aiResult.candidates[0].content.parts[0].text

        // Helper to extract JSON
        let tariffs = []
        try {
            const jsonMatch = textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)
            if (jsonMatch) {
                tariffs = JSON.parse(jsonMatch[0])
            } else {
                tariffs = JSON.parse(textResponse)
            }
        } catch (e) {
            console.error("Failed to parse JSON from AI response:", textResponse)
            throw new Error("Invalid AI response format")
        }

        return new Response(JSON.stringify({ tariffs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('Processing error:', error.message)
        return new Response(JSON.stringify({ error: 'Error al procesar el CSV de la CNMC.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
