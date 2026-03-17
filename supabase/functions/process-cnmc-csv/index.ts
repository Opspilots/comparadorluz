import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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

        const { csv_content } = await req.json()
        if (!csv_content) throw new Error('CSV content is required')

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
