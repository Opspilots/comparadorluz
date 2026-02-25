import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { encode } from "https://deno.land/std@0.192.0/encoding/base64.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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
        if (!authHeader) {
            console.error("No Authorization header found in request.");
            throw new Error('No Authorization header')
        }

        // Create Supabase client
        /* const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        ) */

        // Parse Request Body (Handle JSON or FormData)
        let fileBase64 = "";
        let fileType = "application/pdf";
        let fileName = "document.pdf";

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            console.log("Processing JSON request...");
            const body = await req.json();
            if (!body.fileData) {
                throw new Error("Missing 'fileData' in JSON body");
            }
            fileBase64 = body.fileData;
            fileType = body.fileType || fileType;
            fileName = body.fileName || fileName;
            console.log(`Received Base64 file via JSON: ${fileName} (${fileType})`);

        } else if (contentType.includes('multipart/form-data')) {
            console.log("Processing FormData request...");
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                throw new Error("No file found in formData");
            }

            fileName = file.name;
            fileType = file.type;
            console.log(`Received File via FormData: ${fileName} (${fileType}), size: ${file.size}`);

            // Encode to Base64
            try {
                const arrayBuffer = await file.arrayBuffer();
                fileBase64 = encode(new Uint8Array(arrayBuffer));
            } catch (e: unknown) {
                const error = e instanceof Error ? e : new Error(String(e));
                throw new Error(`Failed to encode file: ${error.message}`);
            }

        } else {
            throw new Error(`Unsupported Content-Type: ${contentType}`);
        }

        // Strip data URI prefix (e.g. "data:application/pdf;base64,") if present
        if (fileBase64.startsWith('data:')) {
            const commaIdx = fileBase64.indexOf(',');
            if (commaIdx !== -1) {
                fileBase64 = fileBase64.substring(commaIdx + 1);
            }
        }



        // Improved Prompt for Tariff Extraction using Gemini 2.0 capabilities
        const geminiPrompt = `
            Eres un experto en el sector energético español (electricidad y gas). Tu tarea es analizar este documento (Ficha de Tarifas, Contrato, Factura o Anexo de Precios) y extraer TODAS las configuraciones de tarifas que encuentres.

            OBJETIVO PRINCIPAL: Extraer los PRECIOS UNITARIOS de Energía y Potencia. Diferencia claramente entre tarifas eléctricas y de gas.

            ESTRUCTURA DE SALIDA (JSON):
            {
                "tariffs": [
                    {
                        "supplier_name": "Nombre Comercializadora (ej: Iberdrola, Endesa, Naturgy...)",
                        "tariff_structure": "2.0TD" | "3.0TD" | "6.1TD" | "6.2TD" | "RL.1" | "RL.2" | "RL.3" | "RL.4",
                        "supply_type": "electricity" | "gas",
                        "tariff_name": "Nombre comercial de la tarifa",
                        "is_indexed": false,
                        "contract_duration": 12, // Duración por defecto si aplica a toda la tarifa, o null.
                        "price_sets": [
                            {
                                "contract_duration": 12, // Precios si firmas a 12 meses
                                "valid_from": "2024-01-01", // Fecha de inicio de validez si aplica (YYYY-MM-DD), o null
                                "valid_to": "2024-06-30", // Fecha fin de validez si aplica (YYYY-MM-DD), o null
                                "energy_prices": [
                                    { "period": "P1", "price": 0.123456 },
                                    { "period": "P2", "price": 0.103456 }
                                ],
                                "power_prices": [
                                    { "period": "P1", "price": 30.123, "unit": "EUR/kW/year" },
                                    { "period": "P2", "price": 10.456, "unit": "EUR/kW/year" }
                                ],
                                "fixed_term_prices": [
                                    { "period": "P1", "price": 5.43, "unit": "EUR/month" }
                                ]
                            },
                            {
                                "contract_duration": 24, // Precios distintos si firmas a 24 meses
                                "valid_from": null,
                                "valid_to": null,
                                "energy_prices": [
                                    { "period": "P1", "price": 0.110000 },
                                    { "period": "P2", "price": 0.090000 }
                                ],
                                "power_prices": [
                                    { "period": "P1", "price": 30.123, "unit": "EUR/kW/year" },
                                    { "period": "P2", "price": 10.456, "unit": "EUR/kW/year" }
                                ]
                            }
                        ]
                    }
                ],
                "debug_raw_text": "Breve muestra del texto crudo donde encontraste los precios."
            }

            REGLAS CRÍTICAS DE EXTRACCIÓN Y AGRUPACIÓN:

            0. **PROHIBICIÓN ESTRICTA DE DUPLICAR PEAJES**: 
               - NUNCA, BAJO NINGUNA CIRCUNSTANCIA, debes generar múltiples objetos en el array "tariffs" si comparten el mismo Peaje ("tariff_structure") y el mismo Suministro ("supply_type").
               - Si un documento lista precios para un peaje (ej. "2.0TD") pero con diferentes duraciones de contrato (ej: 12 meses vs 24 meses) o diferentes periodos de vigencia (ej: "Enero a Junio" vs "Julio a Diciembre"), DEBES FUSIONARLOS TODOS OBLIGATORIAMENTE dentro del array \`price_sets\` de un **único** objeto de tarifa.
               - El array "tariffs" SOLO debe tener múltiples objetos si hay peajes físicamente distintos (ej. uno para 2.0TD y otro para 3.0TD).

            1. **supply_type**: 
               - Si la tarifa usa peajes tipo "RL.x" o menciona "gas", "gas natural", "m³", "factor de conversión" → "gas".
               - Si usa peajes tipo "2.0TD", "3.0TD", "6.xTD" o menciona "electricidad", "kWh de consumo eléctrico" → "electricity".
               - Si no queda claro, pon "electricity" por defecto.

            2. **contract_duration (EXCLUSIVO PARA DURACIÓN DEL CONTRATO)**: 
               - Número ENTERO de MESES del contrato (ej: 12, 24, 36). 
               - Si dice "1 año", pon 12. Si dice "2 años", pon 24. 
               - A nivel de \`price_set\`, si un bloque de precios especifica que es el precio exigido al firmar a "12 meses" o "24 meses", indícalo obligatoriamente aquí (\`contract_duration\`).
               - ¡NUNCA confundas la 'duración del contrato' con las 'fechas de vigencia'! (Ej. no pongas "12 meses" como un rango de fechas \`valid_to\`).

            3. **Rangos de Vigencia (valid_from / valid_to)**:
               - ÚNICAMENTE rige el periodo exacto del calendario durante el cual se puede contratar la tarifa (ej: "Del 01/01/2026 al 30/06/2026").
               - Si el documento muestra precios que cambian según la fecha de facturación en el año, crea un price_set SEPARADO para cada rango de fechas indicando \`valid_from\` y \`valid_to\` en formato ISO (YYYY-MM-DD).
               - NUNCA uses los campos valid_from o valid_to para reflejar la duración de 12 o 24 meses del contrato.
               - IMPORTANTE: NUNCA INVENTES FECHAS de validez basadas en los 12 o 24 meses. Si el contrato dura 12 u 24 meses, pero NO DICE "válido del 1 de enero al 31 de diciembre", ENTONCES NO PONGAS FECHAS, déjalas vacías e informa únicamente el "contract_duration".

            4. **Precios de Energía (€/kWh)**:
               - Si encuentras precios en €/MWh, DIVIDE por 1000. (Ej: 120 €/MWh -> 0.120 €/kWh).

            5. **Precios de Potencia (€/kW/año)**:
               - Si encuentras precios en €/kW/día, MULTIPLICA por 365. (Ej: 0.10 €/kW/día -> 36.5 €/kW/año).
               - Si encuentras precios en €/kW/mes, MULTIPLICA por 12.
               - Indica la unidad final en el campo "unit". PREFERIBLEMENTE "EUR/kW/year".

            6. **Tarifas Indexadas (Pass-through/OMIE)**:
               - Si ves fórmulas tipo "OMIE + 0.01" o "Precio Mercado + Fee", marca "is_indexed": true.
               - En este caso, el "price" de energy_prices debe ser el FEE o GESTIÓN (sobreprecio) si aparece. Si no, pon 0.

            7. **Nombres de Tarifa y Fechas**:
               - Si no encuentras un nombre comercial claro, INVENTA uno descriptivo basado en la estructura (ej: "Tarifa 2.0TD Fija"). NO dejes este campo vacío.

            8. **Término Fijo (fixed_term_prices)**: 
               - Solo para GAS (término fijo mensual) o cargos fijos extra que no sean energía ni potencia.

            9. **Formato**:
               - Devuelve SOLO el JSON válido. Usa punto (.) para decimales.
        `

        console.log("Calling Gemini API with model gemini-2.5-flash...");

        let response;
        let retries = 0;
        const maxRetries = 3;
        let delay = 5000; // Start with 5s delay (Gemini free tier resets per minute)

        while (retries <= maxRetries) {
            try {
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(120000), // 120s timeout (Supabase limit is ~150s)
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: geminiPrompt },
                                { inline_data: { mime_type: fileType, data: fileBase64 } }
                            ]
                        }],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            thinkingConfig: {
                                thinkingBudget: 2048 // Limit thinking tokens to avoid timeout
                            }
                        }
                    })
                });

                if (response.ok) break;

                const errorText = await response.text();
                console.warn(`Gemini API Attempt ${retries + 1} failed: ${response.status} - ${errorText}`);

                if (response.status === 429 && retries < maxRetries) {
                    // Add jitter to avoid thundering herd
                    const jitter = Math.random() * 2000;
                    const waitMs = delay + jitter;
                    console.log(`Rate limit hit. Retrying in ${Math.round(waitMs)}ms (attempt ${retries + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    retries++;
                    delay *= 2; // Exponential backoff: 5s → 10s → 20s
                    continue;
                }

                // If not 429 or max retries reached
                if (response.status === 429) {
                    return new Response(JSON.stringify({
                        error: 'La IA está saturada temporalmente. Por favor, intenta de nuevo en unos minutos.',
                        details: 'Gemini API Rate Limit Exceeded after retries'
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 429,
                    });
                }
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);

            } catch (e: unknown) {
                if (retries === maxRetries) throw e;
                const error = e instanceof Error ? e : new Error(String(e));
                console.error(`Fetch error on attempt ${retries + 1}:`, error);
                retries++;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }

        if (!response || !response.ok) {
            throw new Error(`Failed to get successful response from Gemini after ${maxRetries} retries`);
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
        } catch (e: unknown) {
            // 2. Try regex for markdown code blocks
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/```\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                try {
                    extractedData = JSON.parse(jsonMatch[1])
                } catch (e2: unknown) {
                    const error2 = e2 instanceof Error ? e2 : new Error(String(e2));
                    console.warn("Failed to parse JSON from markdown block:", error2);
                }
            }

            // 3. Last resort cleanup
            if (!extractedData) {
                try {
                    const cleanJson = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
                    extractedData = JSON.parse(cleanJson);
                } catch (e3: unknown) {
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

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("Fatal Error in Edge Function:", error);
        return new Response(JSON.stringify({ error: error.message, details: error.toString() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
