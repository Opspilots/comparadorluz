import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { encode } from "https://deno.land/std@0.192.0/encoding/base64.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Edge Function 'parse-tariff-document' started.");

        // 1. Validate secrets FIRST
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) {
            console.error("CRITICAL: GEMINI_API_KEY is missing in Edge Function secrets.");
            return new Response(JSON.stringify({
                error: 'Configuration Error: GEMINI_API_KEY is missing.',
                details: 'Please set the GEMINI_API_KEY secret in the Supabase Dashboard.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 503, // Service Unavailable
            })
        }

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No Authorization header')

        // Create Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get File from Request
        console.log("Reading formData...");
        let file: File | null = null;
        try {
            const formData = await req.formData()
            file = formData.get('file') as File
        } catch (e) {
            console.error("Error reading formData:", e);
            throw new Error(`Failed to parse form data: ${e.message}`);
        }

        if (!file) {
            console.error("No file found in formData");
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
        console.log(`File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

        console.log("Encoding file to Base64...");
        let base64 = "";
        try {
            const arrayBuffer = await file.arrayBuffer()
            base64 = encode(new Uint8Array(arrayBuffer))
        } catch (e) {
            console.error("Error encoding file:", e);
            throw new Error(`Failed to encode file: ${e.message}`);
        }
        console.log("File encoded successfully.");



        // Improved Prompt for Tariff Extraction using Gemini 2.0 capabilities
        const geminiPrompt = `
            Eres un experto en el sector eléctrico español. Tu tarea es analizar este documento (Ficha de Tarifas, Contrato, Factura o Anexo de Precios) y extraer la CONFIGURACIÓN EXACTA DE LA TARIFA elécrica o de gas.

            OBJETIVO PRINCIPAL: Extraer los PRECIOS UNITARIOS de Energía y Potencia para poder replicar esta tarifa en un comparador.

            ESTRUCTURA DE SALIDA (JSON):
            {
                "supplier_name": "Nombre Comercializadora (ej: Iberdrola, Endesa, Naturgy...)",
                "tariff_structure": "2.0TD" | "3.0TD" | "6.1TD" | "6.2TD" | "RL.1" | "RL.2",
                "tariff_name": "Nombre comercial de la tarifa (ej: Plan Estable, Tarifa Noche...)",
                "is_indexed": boolean, // true si es tarifa indexada (precio variable según mercado/OMIE + fee), false si es precio fijo.
                "energy_prices": [
                    { "period": "P1", "price": 0.123456 }, // Precio en €/kWh.
                    { "period": "P2", "price": 0.103456 },
                    ...
                ],
                "power_prices": [
                    { "period": "P1", "price": 30.123, "unit": "EUR/kW/year" }, // Estandarizar a €/kW/año si es posible.
                    { "period": "P2", "price": 10.456, "unit": "EUR/kW/year" }
                ],
                 "fixed_term_prices": [ // Solo para GAS o cargos fijos extra
                    { "period": "P1", "price": 5.43, "unit": "EUR/month" }
                ]
            }

            REGLAS CRÍTICAS DE EXTRACCIÓN:
            1. **Precios de Energía (€/kWh)**:
               - Si encuentras precios en €/MWh, DIVIDE por 1000. (Ej: 120 €/MWh -> 0.120 €/kWh).
               - Busca tablas de "Término de Energía" o "Precios de Consumo".
               - Extrae TODOS los decimales disponibles (hasta 6).
            
            2. **Precios de Potencia (€/kW/año)**:
               - Si encuentras precios en €/kW/día, MULTIPLICA por 365. (Ej: 0.10 €/kW/día -> 36.5 €/kW/año).
               - Si encuentras precios en €/kW/mes, MULTIPLICA por 12.
               - Indica la unidad final en el campo "unit". PREFERIBLEMENTE "EUR/kW/year".

            3. **Tarifas Indexadas (Pass-through/OMIE)**:
               - Si ves fórmulas tipo "OMIE + 0.01" o "Precio Mercado + Fee", marca "is_indexed": true.
               - En este caso, el "price" de energy_prices debe ser el FEE o GESTIÓN (sobreprecio) si aparece. Si no, pon 0.

            4. **Estructuras Tarifarias (Peajes)**:
               - 2.0TD: Potencia P1, P2. Energía P1, P2, P3.
               - 3.0TD / 6.1TD: Potencia P1-P6. Energía P1-P6.
               - Gas RL.1 / RL.2: Término fijo (EUR/mes) y Término Variable (EUR/kWh).

            5. **Formato**:
               - Devuelve SOLO el JSON válido.
               - Usa punto (.) para decimales.
        `

        console.log("Calling Gemini API with model gemini-2.0-flash...");

        // Using gemini-2.0-flash as requested
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: geminiPrompt },
                        { inline_data: { mime_type: file.type || 'application/pdf', data: base64 } }
                    ]
                }]
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Error: ${response.status} - ${errorText}`);

            if (response.status === 429) {
                return new Response(JSON.stringify({
                    error: 'La IA está saturada temporalmente. Por favor, intenta de nuevo en unos minutos.',
                    details: 'Gemini API Rate Limit Exceeded'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 429,
                })
            }
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const aiResult = await response.json()
        console.log("Gemini API response received.");

        if (!aiResult.candidates || aiResult.candidates.length === 0 || !aiResult.candidates[0].content) {
            console.error("Gemini returned no candidates:", JSON.stringify(aiResult));
            throw new Error("Gemini returned no content.");
        }

        const textResponse = aiResult.candidates[0].content.parts[0].text

        // Robust JSON Extraction (borrowed from comparator logic)
        let extractedData
        try {
            // 1. Try direct parse
            extractedData = JSON.parse(textResponse);
        } catch {
            // 2. Try regex for markdown code blocks
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/```\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                try {
                    extractedData = JSON.parse(jsonMatch[1])
                } catch (e) {
                    console.warn("Failed to parse JSON from markdown block:", e);
                }
            }

            // 3. Last resort cleanup
            if (!extractedData) {
                try {
                    const cleanJson = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                    extractedData = JSON.parse(cleanJson);
                } catch (e) {
                    console.error("Failed to parse AI JSON response. Raw text:", textResponse);
                    throw new Error('Failed to parse AI JSON response: ' + textResponse.substring(0, 100));
                }
            }
        }

        console.log("Data extracted successfully:", JSON.stringify(extractedData).substring(0, 100) + "...");

        return new Response(JSON.stringify(extractedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (err: any) {
        console.error("Fatal Error in Edge Function:", err);
        return new Response(JSON.stringify({ error: err.message, details: err.toString() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
