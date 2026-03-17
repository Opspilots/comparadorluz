
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

        const company_id = userData.company_id
        const { file_path, file_id } = await req.json()

        if (!file_path) {
            throw new Error('Missing required field: file_path')
        }

        // Prevent cross-tenant IDOR — file_path must belong to the caller's company
        if (!file_path.startsWith(`${company_id}/`)) {
            return new Response(JSON.stringify({ error: 'Access denied: file does not belong to your company' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        console.log(`Processing tariff sheet: ${file_path} for company ${company_id}`)

        // 1. Download file from Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('tariff-pdfs')
            .download(file_path)

        if (downloadError) {
            throw new Error(`Failed to download file: ${downloadError.message}`)
        }

        // 2. Prepare AI Prompt for Gemini
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

        // Convert file to base64
        const arrayBuffer = await fileData.arrayBuffer()
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

        const geminiPrompt = `
            Eres un experto en el mercado eléctrico español. Analiza esta hoja de tarifas o contrato de suministro eléctrico y extrae la información de todas las tarifas presentes en formato JSON.
            Es muy probable que el documento contenga UNA TABLA con MÚLTIPLES TARIFAS (por ejemplo: diferentes potencias como 2.0TD, 3.0TD, 6.1TD, o diferentes modalidades).
            DEBES EXTRAER TODAS LAS TARIFAS QUE ENCUENTRES EN EL DOCUMENTO.

            Responde con un ARRAY de objetos JSON, donde cada objeto representa una tarifa.

            PARA CADA TARIFA BUSCA LOS SIGUIENTES DATOS:
            - supplier_name: Nombre de la comercializadora (ej: Iberdrola, Endesa, Naturgy, Galp). SI EL DOCUMENTO DICE "GALP" O "GFF", EL NOMBRE DEBE SER "Galp". NUNCA DEVUELVAS "GFF" O "gf".
            - tariff_name: Nombre comercial de la tarifa (incluye si es Precio Fijo, Indexado, etc).
            - tariff_structure: Tipo de peaje (2.0TD, 3.0TD, 6.1TD, etc).
            - valid_from: Fecha de inicio de vigencia (YYYY-MM-DD). BUSCA ACTIVAMENTE ESTA FECHA EN EL DOCUMENTO (ej: "Válido desde", "Precios aplicables a partir de"). Si no hay absolutamente ninguna fecha, usa la fecha de hoy.
            - valid_to: Fecha de fin de vigencia (YYYY-MM-DD). BUSCA ACTIVAMENTE ESTA FECHA EN EL DOCUMENTO (ej: "hasta el", "Válido hasta"). Si no se especifica una fecha de fin, usa null. ASEGÚRATE DE DEVOLVER ESTOS DATOS Y NO DEJARLOS VACÍOS SI LA INFORMACIÓN ESTÁ EN EL TEXTO.
            - contract_duration: Duración del contrato en MESES (ejemplo: 12). Si no se indica, usa null.
            - is_indexed: true si es una tarifa a precio de mercado/indexada, false si es precio fijo.
            
            PRECIOS DE ENERGÍA (Variable) - €/kWh:
            - energy_p1: Precio P1
            - energy_p2: Precio P2
            - energy_p3: Precio P3
            - energy_p4: Precio P4 (null si no existe)
            - energy_p5: Precio P5 (null si no existe)
            - energy_p6: Precio P6 (null si no existe)

            PRECIOS DE POTENCIA (Fijo) - €/kW/año:
            IMPORTANTE: Si los precios vienen en €/kW/día o €/kW/mes, CONVIÉRTELOS a €/kW/año.
            - power_p1: Precio P1
            - power_p2: Precio P2
            - power_p3: Precio P3
            - power_p4: Precio P4 (null si no existe)
            - power_p5: Precio P5 (null si no existe)
            - power_p6: Precio P6 (null si no existe)
            
            TÉRMINO FIJO (Si existe) - €/mes:
            - fixed_fee: Cuota fija mensual si la tarifa la tiene (common fees, gestión, etc).

            Responde SOLO con el JSON (un Array []). Usa null para valores no encontrados.
        `;

        // 3. Call Gemini API
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
                                mime_type: 'application/pdf', // Assuming PDF, strictly checking mime type would be better
                                data: base64
                            }
                        }
                    ]
                }]
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429) {
                throw new Error('OCR service quota exceeded. Please try again later.');
            }
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const aiResult = await response.json()
        const textResponse = aiResult.candidates[0].content.parts[0].text

        // 4. Extract JSON
        let extractedData
        try {
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/```\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[1])
            } else {
                const cleanJson = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                extractedData = JSON.parse(cleanJson);
            }

            // Ensure it's an array
            if (!Array.isArray(extractedData)) {
                extractedData = [extractedData];
            }

        } catch (e) {
            throw new Error('Failed to parse AI response as JSON: ' + textResponse.substring(0, 100))
        }

        // 5. Update DB (if file_id provided)
        if (file_id) {
            const { error: updateError } = await supabase
                .from('tariff_files')
                .update({
                    extraction_status: 'completed',
                    extracted_data: extractedData, // Store the array
                    extraction_error: null
                })
                .eq('id', file_id)
                .eq('company_id', company_id)

            if (updateError) console.error('Error updating file status:', updateError)
        }

        return new Response(JSON.stringify(extractedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('Processing error:', error.message)

        return new Response(JSON.stringify({ error: 'Error al procesar la hoja de tarifas. Consulta los logs.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
