import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
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

    } catch (err: any) {
        console.error('Processing error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
