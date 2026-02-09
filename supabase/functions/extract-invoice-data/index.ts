import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get the authorization header and extract token
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        // Create Supabase service role client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const formData = await req.formData()
        const file = formData.get('file') as File
        const companyId = formData.get('company_id') as string

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Upload to Storage
        const fileName = `${companyId}/${crypto.randomUUID()}-${file.name}`
        const { data: storageData, error: storageError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file)

        if (storageError) throw storageError

        // 2. Prepare AI Prompt for Gemini
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

        // Convert file to base64 for Gemini API
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

        const geminiPrompt = `
            Eres un experto en el sector eléctrico español. Analiza esta factura y extrae los siguientes campos en formato JSON:
            
            DATOS DEL TITULAR/CLIENTE:
            - customer_name: Nombre completo del titular de la factura
            - cif: CIF (empresa) o NIF (particular) del titular
            - customer_address: Dirección completa del titular
            - customer_city: Ciudad
            - customer_province: Provincia
            
            DATOS TÉCNICOS:
            - cups: Código CUPS completo (formato: ESxxxxxxxxxxxxxxxxxx)
            - tariff_type: Tipo de tarifa (2.0TD, 3.0TD, o 6.1TD)
            - current_supplier: Nombre de la comercializadora actual
            - current_cost: Importe total de la factura estandarizado a MENSUAL (si es bimestral, divide por 2).
            - annual_consumption: Consumo TOTAL ANUAL estimado en kWh (suma de todos los periodos).
            - contracted_power: Potencia contratada PRINCIPAL (P1) en kW.
            
            CONSUMO POR PERIODOS (valores anuales en kWh):
            - p1_consumption_pct: Consumo ANUAL P1
            - p2_consumption_pct: Consumo ANUAL P2
            - p3_consumption_pct: Consumo ANUAL P3  
            - p4_consumption_pct: Consumo ANUAL P4 (solo 3.0TD/6.1TD)
            - p5_consumption_pct: Consumo ANUAL P5 (solo 3.0TD/6.1TD)
            - p6_consumption_pct: Consumo ANUAL P6 (solo 3.0TD/6.1TD)
            
            POTENCIA POR PERIODOS (valores en kW):
            - power_p1: Potencia P1
            - power_p2: Potencia P2
            - power_p3: Potencia P3
            - power_p4: Potencia P4
            - power_p5: Potencia P5
            - power_p6: Potencia P6
            
            IMPORTANTE:
            - Si la factura cubre un periodo mensual, multiplica el consumo por 12. Si es bimestral, por 6.
            - Devuelve "null" si un campo no se encuentra.
            - Responde SOLO con el JSON.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: geminiPrompt },
                        {
                            inline_data: {
                                mime_type: file.type,
                                data: base64
                            }
                        }
                    ]
                }],
                // generationConfig: {
                //     responseMimeType: "application/json"
                // }
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429) {
                throw new Error('El servicio de OCR está saturado temporalmente (Límite de cuota gratuito). Por favor, intenta de nuevo en unos minutos.');
            }
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const aiResult = await response.json()
        const textResponse = aiResult.candidates[0].content.parts[0].text

        // Extract JSON from response (handling potential markdown wrapping, though responseMimeType should fix it)
        let extractedData
        try {
            // Try to parse directly first
            extractedData = JSON.parse(textResponse)
        } catch {
            // If direct parse fails, try to extract JSON from markdown code blocks
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/```\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[1])
            } else {
                // Last ditch attempt: clean up potentially messy JSON
                try {
                    const cleanJson = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                    extractedData = JSON.parse(cleanJson);
                } catch {
                    throw new Error('Could not extract JSON from AI response: ' + textResponse.substring(0, 100))
                }
            }
        }

        // 3. Extract user ID and save to DB
        let userId = null
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                userId = payload.sub || null
            } catch (e) {
                console.warn('Could not decode JWT:', e)
            }
        }

        const { error: dbError } = await supabase
            .from('invoice_extractions')
            .insert({
                company_id: companyId,
                user_id: userId,
                storage_path: storageData.path,
                status: 'completed',
                extracted_data: extractedData
            })

        if (dbError) console.error('Error saving to DB:', dbError)

        return new Response(JSON.stringify(extractedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (err: any) {
        console.error('Extraction error:', err)
        return new Response(JSON.stringify({ error: err.message, details: err.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
