
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts"

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Validate JWT and derive company_id from authenticated user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const token = authHeader.replace('Bearer ', '')

        // Create auth client to validate the JWT
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

        // Create service role client for privileged operations
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Derive company_id from authenticated user — never trust client input
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.company_id) {
            return new Response(JSON.stringify({ error: 'User has no associated company' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        const companyId = userData.company_id
        const userId = user.id

        // Rate limit: max 20 invoice extractions per hour per company
        const rl = await checkRateLimit({
            action: 'extract-invoice-data',
            companyId: companyId,
            maxRequests: 20,
            windowSeconds: 3600,
        })
        if (!rl.allowed) {
            return rateLimitResponse(rl, corsHeaders)
        }

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Validate file type and size
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
        if (!ALLOWED_TYPES.includes(file.type)) {
            return new Response(JSON.stringify({ error: 'Tipo de archivo no soportado. Usa PDF, JPG, PNG o WebP.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
        if (file.size > MAX_SIZE) {
            return new Response(JSON.stringify({ error: 'El archivo es demasiado grande. Máximo 10 MB.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 413,
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
            Eres un experto en el sector energético español (Electricidad y Gas). Analiza esta factura y extrae los siguientes campos en formato JSON:

            CLASIFICACIÓN INICIAL:
            - supply_type: "electricity" o "gas" (Detecta el tipo de suministro. Pistas Gas: "m3", "PCS", "Canon IRC", "RL.1", "RL.2").

            DATOS DEL TITULAR/CLIENTE:
            - customer_name: Nombre completo del titular de la factura
            - cif: CIF (empresa) o NIF (particular) del titular
            - customer_address: Dirección completa del titular
            - customer_city: Ciudad
            - customer_province: Provincia

            DATOS TÉCNICOS:
            - cups: Código CUPS completo (formato: ESxxxxxxxxxxxxxxxxxx)
            - tariff_type:
                - Electricidad: 2.0TD, 3.0TD, o 6.1TD
                - Gas: RL.1, RL.2, RL.3, o RL.4
            - current_supplier: Nombre de la comercializadora actual
            - current_cost: Importe total de la factura estandarizado a MENSUAL en EUR.
            - contracted_power: Potencia contratada (Sólo Electricidad) en kW. "null" para Gas.

            CONSUMO ANUAL - MUY IMPORTANTE, SIGUE ESTOS PASOS:
            - billing_days: Número de días que cubre el periodo de facturación (busca fechas "desde/hasta" o "periodo de facturación").
            - billing_consumption_kwh: Consumo TOTAL en kWh que aparece en la factura para el periodo facturado (suma de todos los periodos P1+P2+P3...).
            - annual_consumption: Consumo ANUAL en kWh. Calcula así:
                1. Si la factura indica explícitamente un "consumo anual" o "estimación anual", usa ese valor.
                2. Si NO hay consumo anual explícito, EXTRAPOLA: annual_consumption = billing_consumption_kwh * 365 / billing_days.
                3. NUNCA devuelvas el consumo del periodo de facturación como consumo anual si el periodo es menor a 300 días.
                4. Un consumo anual doméstico típico es 2000-5000 kWh. Empresas pequeñas: 5000-50000 kWh. Grandes: 50000+.

            PRECIOS Y CONSUMOS (ELECTRICIDAD):
            - p1_consumption_pct, p2_consumption_pct...: Consumo por periodos en kWh (Valor absoluto del periodo facturado).
            - power_p1, power_p2...: Potencia contratada por periodos en kW.
            - energy_prices: Array de objetos { "period": "P1", "price": 0.123, "unit": "EUR/kWh" } (Si aparecen precios explícitos).
            - power_prices: Array de objetos { "period": "P1", "price": 30.5, "unit": "EUR/kW/year" }.

            PRECIOS Y CONSUMOS (GAS):
            - fixed_term_prices: Array de objetos { "period": "P1", "price": 5.43, "unit": "EUR/month" } (El término fijo mensual).
            - energy_prices: Array de objetos { "period": "P1", "price": 0.054, "unit": "EUR/kWh" } (El término variable).

            IMPORTANTE:
            - Normaliza números: Usa PUNTO (.) para decimales. NO miles separators.
            - Si es Gas, "contracted_power" debe ser null o 0.
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
            console.error(`Gemini API error: ${response.status} - ${errorText}`);
            throw new Error('Error al procesar la factura con el servicio de IA.');
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

        // 3. Save extraction to DB (userId and companyId already verified from JWT above)
        const { error: dbError } = await supabase
            .from('invoice_extractions')
            .insert({
                company_id: companyId,
                user_id: userId,
                storage_path: storageData.path,
                status: 'completed',
                extracted_data: extractedData
            })

        if (dbError) {
            console.error('Error saving to DB:', dbError)
            return new Response(JSON.stringify({ ...extractedData, _warning: 'Datos extraídos pero no se pudieron guardar en la base de datos' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 207, // Multi-Status: extraction OK, persistence failed
            })
        }

        return new Response(JSON.stringify(extractedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error('Extraction error:', err.message)
        // Return user-friendly message without internal details
        const safeMessage = err.message.includes('API') || err.message.includes('Gemini')
            ? 'Error al procesar la factura. Inténtalo de nuevo.'
            : err.message;
        return new Response(JSON.stringify({ error: safeMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
