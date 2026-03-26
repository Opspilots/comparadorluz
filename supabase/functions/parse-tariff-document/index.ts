// @ts-expect-error Deno global not available in TS context
declare const Deno: { serve: (handler: (req: Request) => Promise<Response>) => void; env: { get: (key: string) => string | undefined } };

import { encode } from "https://deno.land/std@0.192.0/encoding/base64.ts";

// ============================================================================
// Helpers
// ============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    return encode(new Uint8Array(buffer));
}

import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts"

// Known aggregator/comparison portals that are NOT energy suppliers
const KNOWN_AGGREGATORS = [
    'informaenergia', 'tarifasgasluz', 'comparatarifas', 'selectra',
    'kelisto', 'helpmycash', 'lumio', 'energygo', 'tarifasgas',
    'comparagasluz', 'preciogas', 'tarifasgasyluz', 'comparador',
    'comparativa', 'comparaluz', 'ocu', 'facua',
];

// Known Spanish energy suppliers for extraction from tariff name
const KNOWN_SUPPLIERS = [
    'galp', 'naturgy', 'endesa', 'iberdrola', 'repsol', 'totalenergies', 'total energies',
    'plenitude', 'viesgo', 'audax', 'axpo', 'cepsa', 'bp energy', 'holaluz',
    'factor energia', 'factorenergia', 'som energia', 'somenergia',
    'fenie', 'feníe', 'aldro', 'octopus', 'wekiwi', 'pepe energy', 'pepeenergy',
    'nexus', 'baser', 'sistar', 'ekidom', 'enerbia', 'nufri', 'enel',
    'edf', 'acciona', 'engie', 'lucera', 'essent', 'enii', 'naturgas',
];

/**
 * Checks if a name matches a known aggregator portal (case-insensitive, partial match).
 */
function isAggregator(name: string): boolean {
    const normalized = name.toLowerCase().replace(/[\s._-]/g, '');
    return KNOWN_AGGREGATORS.some(agg => normalized.includes(agg.replace(/[\s._-]/g, '')));
}

/**
 * Tries to extract the real supplier name from the tariff name.
 * Returns the supplier name if found, or null.
 */
function extractSupplierFromTariffName(tariffName: string): string | null {
    if (!tariffName) return null;
    const lower = tariffName.toLowerCase();
    for (const supplier of KNOWN_SUPPLIERS) {
        if (lower.includes(supplier)) {
            // Return the supplier with proper casing from the original string
            const idx = lower.indexOf(supplier);
            return tariffName.substring(idx, idx + supplier.length);
        }
    }
    return null;
}


const SUPPLY_TYPES = new Set(['electricity', 'gas']);

// Period counts per tariff structure
const PERIOD_MAP: Record<string, { energy: number; power: number }> = {
    '2.0TD': { energy: 3, power: 2 },
    '3.0TD': { energy: 6, power: 6 },
    '6.1TD': { energy: 6, power: 6 },
    '6.2TD': { energy: 6, power: 6 },
    '6.3TD': { energy: 6, power: 6 },
    '6.4TD': { energy: 6, power: 6 },
    'RL.1': { energy: 1, power: 0 },
    'RL.2': { energy: 1, power: 0 },
    'RL.3': { energy: 1, power: 0 },
    'RL.4': { energy: 1, power: 0 },
};

// Plausible price ranges (post-unit normalization)
const ENERGY_MIN = 0.001;  // EUR/kWh
const ENERGY_MAX = 1.5;    // EUR/kWh
const POWER_MIN = 0.001;  // EUR/kW/month
const POWER_MAX = 500;    // EUR/kW/month (wide range to cover 6.xTD)

// ============================================================================
// Post-processing & validation
// ============================================================================

interface PriceItem {
    period: string | undefined;
    price: number;
    unit?: string;
}

interface PriceSet {
    contract_duration?: number | null;
    valid_from?: string | null;
    valid_to?: string | null;
    energy_prices?: PriceItem[];
    power_prices?: PriceItem[];
    fixed_term_prices?: PriceItem[];
}

interface ExtractedTariff {
    supplier_name?: string;
    tariff_structure?: string;
    supply_type?: string;
    tariff_name?: string;
    is_indexed?: boolean;
    contract_duration?: number | null;
    price_sets?: PriceSet[];
}

interface ExtractionResult {
    tariffs: ExtractedTariff[];
    debug_raw_text?: string;
}

/**
 * Normalize a single power price to EUR/kW/month.
 */
function normalizePowerPrice(item: PriceItem): PriceItem {
    const unit = (item.unit || '').toUpperCase();
    let price = item.price;

    if (unit.includes('DAY') || unit.includes('DIA') || unit.includes('DÍA')) {
        price = item.price * (365 / 12);
    } else if (unit.includes('YEAR') || unit.includes('AÑO') || unit.includes('ANO')) {
        price = item.price / 12;
    }

    return { ...item, price: Math.round(price * 1000000) / 1000000, unit: 'EUR/kW/month' };
}

/**
 * Normalize an energy price to EUR/kWh.
 */
function normalizeEnergyPrice(item: PriceItem): PriceItem {
    let price = item.price;
    const unit = (item.unit || '').toUpperCase();

    if (unit.includes('MWH') || (price > 1.5 && !unit.includes('KWH'))) {
        price = item.price / 1000;
    }

    return { ...item, price: Math.round(price * 1000000) / 1000000, unit: 'EUR/kWh' };
}

/**
 * Deduplicate price items by period label.
 * Strategy: last occurrence wins (AI tends to output header labels before actual values).
 * Items with no period are kept as-is.
 */
function deduplicateByPeriod(items: PriceItem[]): PriceItem[] {
    const map = new Map<string, PriceItem>();
    const noPeriod: PriceItem[] = [];
    for (const item of items) {
        if (item.period) {
            map.set(item.period.toUpperCase(), item); // last wins
        } else {
            noPeriod.push(item);
        }
    }
    return [...Array.from(map.values()), ...noPeriod];
}

/**
 * Filter energy prices by plausible range.
 */
function filterEnergyRange(items: PriceItem[]): PriceItem[] {
    return items.filter(p => p.price >= ENERGY_MIN && p.price <= ENERGY_MAX);
}

/**
 * Filter power prices by plausible range (after normalization to monthly).
 */
function filterPowerRange(items: PriceItem[]): PriceItem[] {
    return items.filter(p => p.price >= POWER_MIN && p.price <= POWER_MAX);
}

/**
 * Enforce PERIOD_MAP limits: trim to max expected periods for this tariff structure.
 * Sorts by period label (P1, P2...) and keeps only the first N.
 */
function enforceMaxPeriods(items: PriceItem[], maxPeriods: number): PriceItem[] {
    if (items.length <= maxPeriods) return items;
    // Sort: P1 < P2 < P3... then keep first N
    const sorted = [...items].sort((a, b) => {
        const ka = a.period || 'Z';
        const kb = b.period || 'Z';
        return ka.localeCompare(kb, undefined, { numeric: true });
    });
    return sorted.slice(0, maxPeriods);
}

/**
 * Validate and clean the extracted data.
 */
function validateAndNormalize(data: ExtractionResult): ExtractionResult {
    if (!data.tariffs || !Array.isArray(data.tariffs)) {
        data.tariffs = [];
    }

    const cleaned: ExtractedTariff[] = [];

    for (const tariff of data.tariffs) {
        // Normalize tariff_structure
        if (tariff.tariff_structure) {
            tariff.tariff_structure = tariff.tariff_structure.toUpperCase().trim()
                .replace(/,/g, '.')
                .replace(/O(?=TD)/g, '0');
        }

        // Validate supply_type
        if (!tariff.supply_type || !SUPPLY_TYPES.has(tariff.supply_type)) {
            tariff.supply_type = tariff.tariff_structure?.startsWith('RL') ? 'gas' : 'electricity';
        }

        // Ensure tariff_name
        if (!tariff.tariff_name || tariff.tariff_name.trim() === '') {
            tariff.tariff_name = `Tarifa ${tariff.tariff_structure || 'Desconocida'} - ${tariff.supplier_name || 'Sin nombre'}`;
        }

        // Clean supplier_name and detect aggregator portals
        if (tariff.supplier_name) {
            tariff.supplier_name = tariff.supplier_name
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                .trim();

            // If the extracted name looks like a comparison portal, try to find the real supplier
            if (isAggregator(tariff.supplier_name)) {
                console.warn(`Detected aggregator portal as supplier: "${tariff.supplier_name}". Attempting to extract real supplier from tariff name.`);
                const realSupplier = extractSupplierFromTariffName(tariff.tariff_name || '')
                    || extractSupplierFromTariffName(tariff.tariff_structure || '');
                if (realSupplier) {
                    console.log(`  → Corrected supplier: "${realSupplier}"`);
                    // Capitalize properly
                    tariff.supplier_name = realSupplier.charAt(0).toUpperCase() + realSupplier.slice(1);
                } else {
                    // Keep aggregator name but flag it so the user knows
                    console.warn(`  → Could not determine real supplier. Keeping: "${tariff.supplier_name}"`);
                }
            }
        }

        // Normalize contract_duration
        if (tariff.contract_duration) {
            tariff.contract_duration = Math.round(Number(tariff.contract_duration));
            if (tariff.contract_duration <= 0 || tariff.contract_duration > 120) {
                tariff.contract_duration = null;
            }
        }

        if (!tariff.price_sets || !Array.isArray(tariff.price_sets) || tariff.price_sets.length === 0) {
            tariff.price_sets = [];
        }

        // Get period limits for this tariff structure
        const limits = PERIOD_MAP[tariff.tariff_structure || ''] || { energy: 6, power: 6 };

        for (const set of tariff.price_sets) {
            // Normalize set contract_duration
            if (set.contract_duration) {
                set.contract_duration = Math.round(Number(set.contract_duration));
                if (set.contract_duration <= 0 || set.contract_duration > 120) {
                    set.contract_duration = null;
                }
            }

            // Validate dates
            if (set.valid_from && !/^\d{4}-\d{2}-\d{2}$/.test(set.valid_from)) {
                set.valid_from = null;
            }
            if (set.valid_to && !/^\d{4}-\d{2}-\d{2}$/.test(set.valid_to)) {
                set.valid_to = null;
            }

            // ── Energy prices ──
            if (set.energy_prices && Array.isArray(set.energy_prices)) {
                let ep = set.energy_prices
                    .filter(p => p.price != null && !isNaN(Number(p.price)))
                    .map(p => ({
                        ...normalizeEnergyPrice({ ...p, price: Number(p.price) }),
                        period: p.period || undefined,
                    }));

                // Assign missing periods
                ep.forEach((p, i) => { if (!p.period) p.period = `P${i + 1}`; });

                // Post-processing pipeline: deduplicate → range filter → period limit
                ep = deduplicateByPeriod(ep);
                ep = filterEnergyRange(ep);
                ep = enforceMaxPeriods(ep, limits.energy);

                set.energy_prices = ep;
            } else {
                set.energy_prices = [];
            }

            // ── Power prices ──
            if (set.power_prices && Array.isArray(set.power_prices)) {
                let pp = set.power_prices
                    .filter(p => p.price != null && !isNaN(Number(p.price)))
                    .map(p => ({
                        ...normalizePowerPrice({ ...p, price: Number(p.price) }),
                        period: p.period || undefined,
                    }));

                pp.forEach((p, i) => { if (!p.period) p.period = `P${i + 1}`; });

                // Post-processing pipeline
                pp = deduplicateByPeriod(pp);
                pp = filterPowerRange(pp);
                pp = enforceMaxPeriods(pp, limits.power);

                set.power_prices = pp;
            } else {
                set.power_prices = [];
            }

            // ── Fixed term prices ──
            if (set.fixed_term_prices && Array.isArray(set.fixed_term_prices)) {
                set.fixed_term_prices = set.fixed_term_prices
                    .filter(p => p.price != null && !isNaN(Number(p.price)))
                    .map(p => ({ ...p, price: Number(p.price), unit: p.unit || 'EUR/month' }));
            } else {
                set.fixed_term_prices = [];
            }
        }

        // Remove empty price_sets
        tariff.price_sets = tariff.price_sets.filter(
            set => (set.energy_prices && set.energy_prices.length > 0) ||
                (set.power_prices && set.power_prices.length > 0) ||
                (set.fixed_term_prices && set.fixed_term_prices.length > 0)
        );

        // Auto-fill valid_to for consecutive validity periods within the same contract duration.
        // Rule: valid_to[i] = valid_from[i+1] - 1 day (last period stays open-ended).
        if (tariff.price_sets.length > 1) {
            const byDuration = new Map<string, PriceSet[]>();
            for (const s of tariff.price_sets) {
                const key = String(s.contract_duration ?? 'null');
                if (!byDuration.has(key)) byDuration.set(key, []);
                byDuration.get(key)!.push(s);
            }
            for (const group of byDuration.values()) {
                if (group.length <= 1) continue;
                const withDate = group
                    .filter(s => s.valid_from)
                    .sort((a, b) => (a.valid_from || '').localeCompare(b.valid_from || ''));
                for (let i = 0; i < withDate.length - 1; i++) {
                    if (!withDate[i].valid_to) {
                        const nextDate = new Date(withDate[i + 1].valid_from!);
                        nextDate.setDate(nextDate.getDate() - 1);
                        withDate[i].valid_to = nextDate.toISOString().split('T')[0];
                    }
                }
            }
        }

        if (tariff.price_sets.length > 0) {
            cleaned.push(tariff);
        } else {
            console.warn(`Dropping tariff "${tariff.tariff_name}" — no valid price sets after normalization`);
        }
    }

    // Deduplicate tariffs: merge price_sets only if same supplier+name+structure+supply_type
    // Different tariff_names = different commercial products → always separate objects
    const mergedMap = new Map<string, ExtractedTariff>();
    for (const tariff of cleaned) {
        const key = `${(tariff.supplier_name || '').toLowerCase().trim()}_${(tariff.tariff_name || '').toLowerCase().trim()}_${tariff.tariff_structure || ''}_${tariff.supply_type || ''}`;
        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            existing.price_sets = [...(existing.price_sets || []), ...(tariff.price_sets || [])];
        } else {
            mergedMap.set(key, tariff);
        }
    }

    return {
        tariffs: Array.from(mergedMap.values()),
        debug_raw_text: data.debug_raw_text || '',
    };
}

// ============================================================================
// Gemini Prompt
// ============================================================================

const EXTRACTION_PROMPT = `
Eres un analizador OCR especializado en el mercado energético español. Tu ÚNICA tarea es extraer precios de tarifas de electricidad y gas de documentos PDF.

ANALIZA EL DOCUMENTO ADJUNTO PASO A PASO:
1. Identifica el nombre de la COMERCIALIZADORA DE ENERGÍA (empresa que vende la energía: Galp, Naturgy, Endesa, Iberdrola, Repsol, etc.).
   ⚠️ IMPORTANTE: Si el documento proviene de un PORTAL COMPARADOR (informaenergia, tarifasgasluz, comparatarifas, selectra, kelisto, helpmycash, energygo, etc.), ese portal NO es la comercializadora.
   → Busca el nombre real de la comercializadora EN EL CONTENIDO: en el nombre de la tarifa, en el cuerpo del texto, en tablas o en logotipos de marca de empresa energética.
   → Ejemplo: documento de informaenergia.es sobre tarifas de Galp → supplier_name: "Galp", NUNCA "InformaEnergia".
2. Identifica qué peajes aparecen en el documento (2.0TD, 3.0TD, 6.1TD, etc.).
3. Localiza TODAS las tablas de precios y determina si son:
   a) TABLAS INDIVIDUALES: una tabla por peaje separado (lo más común)
   b) TABLAS COMPARATIVAS: una sola tabla donde las COLUMNAS son distintos peajes

4. Extrae los valores numéricos con MÁXIMA PRECISIÓN (todos los decimales visibles).

════════════════════════════════════════════════════════════
⚠️ REGLA CRÍTICA — TABLAS COMPARATIVAS (muy importante):

Si el documento tiene UNA TABLA con múltiples peajes como columnas, como:

        │  2.0TD  │  3.0TD  │  6.1TD  │
───────────────────────────────────────
P1      │ 0.1234  │ 0.1567  │ 0.1890  │
P2      │ 0.1034  │ 0.1234  │ 0.1567  │
P3      │ 0.0834  │ ...     │ ...     │

→ DEBES crear UN OBJETO SEPARADO en "tariffs" para CADA COLUMNA/PEAJE.
→ El 0.1234 de 2.0TD va en el objeto de 2.0TD, el 0.1567 de 3.0TD en el de 3.0TD. NUNCA juntes valores de diferentes columnas en el mismo objeto.
→ Para 2.0TD: energy_prices tendrá EXACTAMENTE 3 entradas (P1, P2, P3), power_prices EXACTAMENTE 2 (P1, P2).
→ Para 3.0TD/6.xTD: energy_prices tendrá EXACTAMENTE 6 entradas (P1-P6), power_prices EXACTAMENTE 6 (P1-P6).
════════════════════════════════════════════════════════════

⚠️ OTRA REGLA CRÍTICA — NO PROCESES TÍTULOS COMO PRECIOS:

Las etiquetas de fila ("P1", "P2", "Término de Energía", "Término de Potencia", "Período") son TÍTULOS, NO PRECIOS.
→ "P1" como etiqueta de fila → es el valor del campo "period", NO un precio.
→ Solo extrae como "price" los valores numéricos decimales reales (0.1234, 2.5102, etc.).
→ NUNCA pongas price: 1 o price: 2 por haber leído "P1" o "P2" como precio.

════════════════════════════════════════════════════════════

ESTRUCTURA DE SALIDA (JSON estricto):
{
    "tariffs": [
        {
            "supplier_name": "Nombre exacto de la Comercializadora",
            "tariff_structure": "2.0TD",
            "supply_type": "electricity",
            "tariff_name": "Nombre comercial de la tarifa",
            "is_indexed": false,
            "contract_duration": null,
            "price_sets": [
                {
                    "contract_duration": null,
                    "valid_from": null,
                    "valid_to": null,
                    "energy_prices": [
                        { "period": "P1", "price": 0.123456 },
                        { "period": "P2", "price": 0.103456 },
                        { "period": "P3", "price": 0.083456 }
                    ],
                    "power_prices": [
                        { "period": "P1", "price": 2.510250, "unit": "EUR/kW/month" },
                        { "period": "P2", "price": 0.871500, "unit": "EUR/kW/month" }
                    ],
                    "fixed_term_prices": []
                }
            ]
        },
        {
            "supplier_name": "Nombre exacto de la Comercializadora",
            "tariff_structure": "RL.1",
            "supply_type": "gas",
            "tariff_name": "Nombre comercial de la tarifa gas",
            "is_indexed": false,
            "contract_duration": null,
            "price_sets": [
                {
                    "contract_duration": null,
                    "valid_from": null,
                    "valid_to": null,
                    "energy_prices": [
                        { "period": "P1", "price": 0.056789 }
                    ],
                    "power_prices": [],
                    "fixed_term_prices": [
                        { "period": "P1", "price": 7.23, "unit": "EUR/month" }
                    ]
                }
            ]
        }
    ],
    "debug_raw_text": "Fragmento del texto donde encontraste los precios principales"
}

REGLAS GENERALES:

SUPPLIER_NAME (MUY IMPORTANTE):
- Debe ser el nombre de la COMERCIALIZADORA DE ENERGÍA, no el sitio web ni el portal donde se obtuvo el documento.
- Portales comparadores que NO son comercializadoras: informaenergia, tarifasgasluz, comparatarifas, selectra, kelisto, helpmycash, lumio, energygo, tarifasgas, comparagasluz, preciogas, tarifasgasyluz.
- Si el nombre extraído coincide con un portal comparador, busca la comercializadora real dentro del nombre de la tarifa o del cuerpo del documento.
- Comercializadoras válidas (ejemplos): Galp, Naturgy, Endesa, Iberdrola, Repsol, TotalEnergies, Plenitude, Viesgo, Audax, Axpo, Cepsa, Holaluz, Factor Energía, Som Energia, Feníe Energía, Aldro, Octopus Energy, Wekiwi, Pepe Energy.

AGRUPACIÓN (MUY IMPORTANTE):

⚠️ REGLA CRÍTICA DE AGRUPACIÓN — LEE CON CUIDADO:
Si el MISMO producto comercial aparece en el documento con:
  a) Diferentes duraciones de contrato (12 meses, 24 meses, 36 meses...)
  b) Diferentes periodos de vigencia (1T 2026, 2T 2026, enero-marzo, etc.)
→ DEBES crear UN ÚNICO objeto en "tariffs" con MÚLTIPLES "price_sets" (uno por duración/vigencia).
→ NUNCA crees objetos separados en "tariffs" por diferentes duraciones o vigencias del mismo producto.
→ El "tariff_name" es SIEMPRE el nombre comercial del producto (sin incluir la duración ni la vigencia).
→ El "contract_duration" de cada opción va DENTRO del "price_set" correspondiente, NO en el nivel raíz.

Ejemplo CORRECTO — misma tarifa con 2 duraciones distintas:
{
    "tariff_name": "Tarifa Fija Plus",
    "tariff_structure": "2.0TD",
    "contract_duration": null,
    "price_sets": [
        { "contract_duration": 12, "valid_from": null, "valid_to": null, "energy_prices": [{"period":"P1","price":0.15},{"period":"P2","price":0.12},{"period":"P3","price":0.09}], "power_prices": [{"period":"P1","price":3.5},{"period":"P2","price":1.2}] },
        { "contract_duration": 24, "valid_from": null, "valid_to": null, "energy_prices": [{"period":"P1","price":0.14},{"period":"P2","price":0.11},{"period":"P3","price":0.08}], "power_prices": [{"period":"P1","price":3.3},{"period":"P2","price":1.1}] }
    ]
}

Ejemplo CORRECTO — misma tarifa con 2 vigencias distintas:
{
    "tariff_name": "Tarifa Fija Plus",
    "tariff_structure": "2.0TD",
    "contract_duration": null,
    "price_sets": [
        { "contract_duration": null, "valid_from": "2026-01-01", "valid_to": "2026-03-31", "energy_prices": [{"period":"P1","price":0.15},{"period":"P2","price":0.12},{"period":"P3","price":0.09}], "power_prices": [{"period":"P1","price":3.5},{"period":"P2","price":1.2}] },
        { "contract_duration": null, "valid_from": "2026-04-01", "valid_to": "2026-06-30", "energy_prices": [{"period":"P1","price":0.16},{"period":"P2","price":0.13},{"period":"P3","price":0.10}], "power_prices": [{"period":"P1","price":3.6},{"period":"P2","price":1.3}] }
    ]
}

OTRAS REGLAS DE AGRUPACIÓN:
- Cada producto comercial DISTINTO (diferente tariff_name) → SIEMPRE un objeto separado en "tariffs", aunque tengan el mismo supplier_name + tariff_structure + supply_type.
- NUNCA fusiones precios de productos con nombres distintos en el mismo objeto "tariffs".
- Diferentes peajes (2.0TD vs 3.0TD) → SIEMPRE objetos separados en "tariffs".
- Si el documento tiene N productos distintos con el mismo peaje (ej: 4 tarifas 2.0TD con nombres distintos), debes crear N objetos en "tariffs", uno por producto.

CLASIFICACIÓN:
- Peajes RL.1, RL.2, RL.3, RL.4 → supply_type: "gas"
- Peajes 2.0TD, 3.0TD, 6.xTD → supply_type: "electricity"

PERIODOS POR PEAJE (máximo estricto, NO añadir más):
- 2.0TD: Energía exactamente P1-P3 (3 periodos), Potencia exactamente P1-P2 (2 periodos)
- 3.0TD: Energía exactamente P1-P6 (6 periodos), Potencia exactamente P1-P6 (6 periodos)
- 6.1TD/6.2TD/6.3TD/6.4TD: igual que 3.0TD (6+6)
- RL.1-RL.4 (GAS): Energía solo P1 (1 periodo, en €/kWh = Término Variable), sin potencia.
  El Término Fijo o Cuota Fija mensual (€/mes) → ponlo en "fixed_term_prices" con period: "P1".

GAS — ESTRUCTURA DE PEAJES (usa el consumo anual o la denominación del documento):
- RL.1: consumo anual ≤ 5.000 kWh/año (pequeño consumidor)
- RL.2: consumo anual entre 5.001 y 50.000 kWh/año
- RL.3: consumo anual entre 50.001 y 100.000 kWh/año
- RL.4: consumo anual > 100.000 kWh/año
Si el documento indica el peaje de gas (RL.1, RL.2, etc.) úsalo directamente.
Si no lo indica, usa RL.1 como valor por defecto para gas residencial.

CONVERSIÓN DE UNIDADES (IMPORTANTE):
- Energía: Siempre en €/kWh. Si ves €/MWh → DIVIDE por 1000.
- Potencia: Siempre en €/kW/mes. Pon SIEMPRE "unit": "EUR/kW/month".
  * Si ves €/kW/día → MULTIPLICA por 30.4167
  * Si ves €/kW/año → DIVIDE por 12

DURACIÓN vs VIGENCIA (NO confundir):
- contract_duration: Meses del contrato (12, 24, 36). Solo si está explícito.
- valid_from/valid_to: Fechas en YYYY-MM-DD.
  ⚠️ REGLA CRÍTICA: Si el documento muestra una fecha de inicio de vigencia, SIEMPRE busca también la fecha de fin.
  * Ejemplo: "Precios válidos del 01/01/2026 al 31/03/2026" → valid_from: "2026-01-01", valid_to: "2026-03-31"
  * Ejemplo: "Vigencia: enero-marzo 2026" → valid_from: "2026-01-01", valid_to: "2026-03-31"
  * Ejemplo: "Tarifas 1T 2026" → valid_from: "2026-01-01", valid_to: "2026-03-31"
  * Ejemplo: "Tarifas 2T 2026" → valid_from: "2026-04-01", valid_to: "2026-06-30"
  * NUNCA pongas valid_from sin valid_to si el documento tiene una fecha de fin visible o implícita (trimestre, semestre, mes concreto).
  * Si hay valid_from pero la fecha de fin NO se puede determinar del documento, pon valid_to: null.

TARIFAS INDEXADAS:
- OMIE, Pool, Precio Mercado → is_indexed: true, price = FEE/sobreprecio (0 si no hay)

PRECISIÓN NUMÉRICA:
- Copia TODOS los decimales visibles (hasta 6 decimales).
- Separador decimal: SIEMPRE punto (.). Ejemplo: "0,123456" → 0.123456

FORMATO:
- Devuelve ÚNICAMENTE JSON válido, sin comentarios ni texto adicional.
`;

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Edge Function 'parse-tariff-document' started.");

        // 1. Validate secrets
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
            console.error("CRITICAL: GEMINI_API_KEY is missing.");
            return new Response(JSON.stringify({
                error: 'Error de configuración: GEMINI_API_KEY no está configurada.',
                details: 'Configura el secreto GEMINI_API_KEY en el panel de Supabase.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 503,
            });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                error: 'No autorizado',
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Verify JWT — reject invalid tokens
        const token = authHeader.replace('Bearer ', '');
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !authUser) {
            return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Rate limit: max 50 document parses per hour per user
        // Use user ID as company_id proxy since this function doesn't track companies
        const rl = await checkRateLimit({
            action: 'parse-tariff-document',
            companyId: authUser.id,
            maxRequests: 50,
            windowSeconds: 3600,
        })
        if (!rl.allowed) {
            return rateLimitResponse(rl, corsHeaders)
        }

        // 2. Parse request body
        let fileBase64 = '';
        let fileType = 'application/pdf';
        let fileName = 'document.pdf';

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json();
            if (!body.fileData) throw new Error("Falta 'fileData' en el cuerpo JSON");
            fileBase64 = body.fileData;
            fileType = body.fileType || fileType;
            fileName = body.fileName || fileName;
            console.log(`JSON request: ${fileName} (${fileType})`);

        } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            if (!file) throw new Error('No se encontró ningún archivo en formData');
            fileName = file.name;
            fileType = file.type;
            console.log(`FormData request: ${fileName} (${fileType}), size: ${file.size}`);
            const arrayBuffer = await file.arrayBuffer();
            fileBase64 = arrayBufferToBase64(arrayBuffer);

        } else {
            throw new Error(`Content-Type no soportado: ${contentType}`);
        }

        // Strip data URI prefix if present
        if (fileBase64.startsWith('data:')) {
            const commaIdx = fileBase64.indexOf(',');
            if (commaIdx !== -1) fileBase64 = fileBase64.substring(commaIdx + 1);
        }

        // 3. Call Gemini API with retry logic
        console.log("Calling Gemini API with fallback capabilities...");

        let response: Response | undefined;
        let retries = 0;
        const maxRetries = 1; // 2 total attempts max (120s each fits in Supabase's limit)
        const model = 'gemini-2.5-flash';

        while (retries <= maxRetries) {
            try {
                // If flash is exhausted, switch to flash-lite as fallback
                if (retries === 1) {
                    console.log("Switching to gemini-2.5-flash fallback (retry)...");
                }

                console.log(`[Attempt ${retries + 1}/${maxRetries + 1}] Using model: ${model}`);

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(120000), // 120s limit
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: EXTRACTION_PROMPT },
                                    { inline_data: { mime_type: fileType, data: fileBase64 } }
                                ]
                            }],
                            generationConfig: {
                                responseMimeType: 'application/json',
                                temperature: 0.1,
                                thinkingConfig: { thinkingBudget: 4096 },
                                responseSchema: {
                                    type: "OBJECT",
                                    properties: {
                                        tariffs: {
                                            type: "ARRAY",
                                            items: {
                                                type: "OBJECT",
                                                properties: {
                                                    supplier_name: { type: "STRING" },
                                                    tariff_structure: { type: "STRING" },
                                                    supply_type: { type: "STRING" },
                                                    tariff_name: { type: "STRING" },
                                                    is_indexed: { type: "BOOLEAN" },
                                                    contract_duration: { type: "NUMBER", nullable: true },
                                                    price_sets: {
                                                        type: "ARRAY",
                                                        items: {
                                                            type: "OBJECT",
                                                            properties: {
                                                                contract_duration: { type: "NUMBER", nullable: true },
                                                                valid_from: { type: "STRING", nullable: true },
                                                                valid_to: { type: "STRING", nullable: true },
                                                                energy_prices: {
                                                                    type: "ARRAY",
                                                                    items: {
                                                                        type: "OBJECT",
                                                                        properties: {
                                                                            period: { type: "STRING" },
                                                                            price: { type: "NUMBER" },
                                                                            unit: { type: "STRING", nullable: true }
                                                                        },
                                                                        required: ["period", "price"]
                                                                    }
                                                                },
                                                                power_prices: {
                                                                    type: "ARRAY",
                                                                    items: {
                                                                        type: "OBJECT",
                                                                        properties: {
                                                                            period: { type: "STRING" },
                                                                            price: { type: "NUMBER" },
                                                                            unit: { type: "STRING", nullable: true }
                                                                        },
                                                                        required: ["period", "price"]
                                                                    }
                                                                },
                                                                fixed_term_prices: {
                                                                    type: "ARRAY",
                                                                    items: {
                                                                        type: "OBJECT",
                                                                        properties: {
                                                                            period: { type: "STRING" },
                                                                            price: { type: "NUMBER" },
                                                                            unit: { type: "STRING", nullable: true }
                                                                        },
                                                                        required: ["period", "price"]
                                                                    }
                                                                }
                                                            },
                                                            required: ["energy_prices", "power_prices", "fixed_term_prices"]
                                                        }
                                                    }
                                                },
                                                required: ["supplier_name", "tariff_structure", "supply_type", "tariff_name", "price_sets"]
                                            }
                                        },
                                        debug_raw_text: { type: "STRING" }
                                    },
                                    required: ["tariffs"]
                                }
                            }
                        })
                    }
                );

                if (response.ok) break;

                const errorText = await response.text();
                console.warn(`Gemini attempt ${retries + 1}/${maxRetries + 1}: ${response.status} - ${errorText}`);

                if (response.status === 429 && retries < maxRetries) {
                    const delay = Math.pow(2, retries) * 5000; // 5s, 10s, 20s
                    console.log(`Rate limited (429). Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries++;
                    continue;
                }

                if (response.status === 429) {
                    return new Response(JSON.stringify({
                        error: 'Los servidores de IA de Google están saturados en este momento. Hemos intentado cambiar de modelo automáticamente pero no ha sido posible.',
                        details: 'Gemini API rate limit exhausted all retries and fallback models'
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
                }

                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);

            } catch (e: unknown) {
                if (retries === maxRetries) throw e;
                const error = e instanceof Error ? e : new Error(String(e));
                console.error(`Fetch error attempt ${retries + 1}:`, error.message);

                const delay = Math.pow(2, retries) * 5000;
                await new Promise(r => setTimeout(r, delay));
                retries++;
            }
        }

        if (!response || !response.ok) {
            throw new Error(`No se obtuvo respuesta válida de Gemini tras los reintentos permitidos`);
        }

        // 4. Parse Gemini response
        const aiResult = await response.json();

        if (!aiResult.candidates?.length || !aiResult.candidates[0].content) {
            console.error("Gemini returned no candidates:", JSON.stringify(aiResult).substring(0, 500));
            if (aiResult.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error('El documento fue bloqueado por el filtro de seguridad de la IA.');
            }
            throw new Error('La IA no devolvió contenido. El documento puede estar vacío o ser ilegible.');
        }

        const textResponse = aiResult.candidates[0].content.parts[0].text;
        console.log(`Gemini response length: ${textResponse.length} chars`);

        // 5. Robust JSON extraction
        let extractedData: ExtractionResult;
        try {
            extractedData = JSON.parse(textResponse);
        } catch {
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                textResponse.match(/```\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    extractedData = JSON.parse(jsonMatch[1]);
                } catch {
                    const cleaned = jsonMatch[1]
                        .replace(/,\s*}/g, '}')
                        .replace(/,\s*]/g, ']')
                        .replace(/\/\/[^\n]*/g, '');
                    extractedData = JSON.parse(cleaned);
                }
            } else {
                const firstBrace = textResponse.indexOf('{');
                const lastBrace = textResponse.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    extractedData = JSON.parse(textResponse.substring(firstBrace, lastBrace + 1));
                } else {
                    console.error("Failed to extract JSON. Raw:", textResponse.substring(0, 300));
                    throw new Error('No se pudo interpretar la respuesta de la IA como JSON válido.');
                }
            }
        }

        // 6. Post-process: validate, normalize, deduplicate, enforce limits
        const normalizedData = validateAndNormalize(extractedData);

        console.log(`Extraction complete: ${normalizedData.tariffs.length} tariff(s) found`);
        normalizedData.tariffs.forEach((t, i) => {
            const totalSets = t.price_sets?.length || 0;
            const totalEnergy = t.price_sets?.reduce((sum, s) => sum + (s.energy_prices?.length || 0), 0) || 0;
            const totalPower = t.price_sets?.reduce((sum, s) => sum + (s.power_prices?.length || 0), 0) || 0;
            console.log(`  [${i}] ${t.supplier_name} | ${t.tariff_structure} | sets:${totalSets} | E:${totalEnergy} | P:${totalPower}`);
        });

        return new Response(JSON.stringify(normalizedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("Fatal Error:", error.message);
        // Return user-friendly message, keep details in server logs
        const safeMessage = error.message.includes('Gemini') || error.message.includes('API')
            ? 'Error al procesar el documento. Inténtalo de nuevo.'
            : error.message;
        return new Response(JSON.stringify({
            error: safeMessage
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
