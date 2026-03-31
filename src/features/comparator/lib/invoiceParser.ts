export interface ParsedInvoiceData {
    customer_name?: string
    cif?: string
    cups?: string
    tariff_type?: string
    supply_type?: 'electricity' | 'gas'
    annual_consumption?: number
    contracted_power?: number
    current_cost?: number
    current_supplier?: string
    power_p1?: number
    power_p2?: number
    power_p3?: number
    power_p4?: number
    power_p5?: number
    power_p6?: number
    p1_consumption_pct?: number
    p2_consumption_pct?: number
    p3_consumption_pct?: number
    p4_consumption_pct?: number
    p5_consumption_pct?: number
    p6_consumption_pct?: number
    billing_days?: number
    conversion_factor?: number
    _confidence: number // 0-100, how many fields we found
    _method: 'local'
}

// Known Spanish energy suppliers for detection
const KNOWN_SUPPLIERS = [
    'Iberdrola', 'Endesa', 'Naturgy', 'Repsol', 'TotalEnergies', 'Galp',
    'Holaluz', 'Lucera', 'Aldro', 'Audax', 'Factor Energia', 'Factor Energía',
    'Nexus', 'Podo', 'EDP', 'Cepsa', 'Engie', 'Enel', 'Viesgo', 'Curenergia',
    'Fenie Energia', 'Fenie Energía', 'Axpo', 'Eleia', 'Escandinava',
    'Octopus', 'Pepeenergy', 'Indexo', 'Xenera', 'Bassol', 'Selectra',
    'SomEnergia', 'Som Energia', 'Gesternova', 'Goiener',
]

function parseSpanishNumber(str: string): number {
    // "1.234,56" -> 1234.56 | "1234.56" -> 1234.56 | "1234,56" -> 1234.56
    let s = str.trim().replace(/\s/g, '')
    if (s.includes('.') && s.includes(',')) {
        const dotIdx = s.lastIndexOf('.')
        const commaIdx = s.lastIndexOf(',')
        if (dotIdx < commaIdx) {
            // European: 1.234,56
            s = s.replace(/\./g, '').replace(',', '.')
        } else {
            // US: 1,234.56
            s = s.replace(/,/g, '')
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.')
    } else if ((s.match(/\./g) || []).length > 1) {
        s = s.replace(/\./g, '')
    }
    return parseFloat(s)
}

// Number pattern that handles both "1234.56" and "1.234,56" formats
const NUM = `[\\d]+(?:[.,]\\d{3})*(?:[.,]\\d{1,4})?`

function extractCUPS(text: string): string | undefined {
    // CUPS format: ES followed by 16 digits and 2 letters (sometimes with spaces)
    const m = text.match(/ES\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?[A-Z]{2}(?:\s?\d[A-Z])?/i)
    if (m) return m[0].replace(/\s/g, '').toUpperCase()
    return undefined
}

function extractCIF(text: string): string | undefined {
    // CIF: letter + 8 digits | NIF: 8 digits + letter | NIE: X/Y/Z + 7 digits + letter
    const patterns = [
        /\b([A-H,J,K,N,P-S,U,V,W])\s?(\d{7,8})\b/,  // CIF
        /\b(\d{8})\s?([A-Z])\b/,                        // NIF
        /\b([XYZ])\s?(\d{7})\s?([A-Z])\b/,             // NIE
    ]
    for (const p of patterns) {
        const m = text.match(p)
        if (m) return m[0].replace(/\s/g, '')
    }
    return undefined
}

function extractTariffType(text: string): { tariff: string, supplyType: 'electricity' | 'gas' } | undefined {
    const upper = text.toUpperCase()
    // Gas tariffs
    if (/\bRL[\s.]?1\b/.test(upper)) return { tariff: 'RL.1', supplyType: 'gas' }
    if (/\bRL[\s.]?2\b/.test(upper)) return { tariff: 'RL.2', supplyType: 'gas' }
    if (/\bRL[\s.]?3\b/.test(upper)) return { tariff: 'RL.3', supplyType: 'gas' }
    if (/\bRL[\s.]?4\b/.test(upper)) return { tariff: 'RL.4', supplyType: 'gas' }
    // Electricity tariffs
    if (/\b2[\s.]?0\s?TD\b/.test(upper)) return { tariff: '2.0TD', supplyType: 'electricity' }
    if (/\b3[\s.]?0\s?TD\b/.test(upper)) return { tariff: '3.0TD', supplyType: 'electricity' }
    if (/\b6[\s.]?1\s?TD\b/.test(upper)) return { tariff: '6.1TD', supplyType: 'electricity' }
    if (/\b6[\s.]?2\s?TD\b/.test(upper)) return { tariff: '6.2TD', supplyType: 'electricity' }
    // Legacy codes
    if (/\b2\.0A\b/.test(upper)) return { tariff: '2.0TD', supplyType: 'electricity' }
    if (/\b2\.0DHA\b/.test(upper)) return { tariff: '2.0TD', supplyType: 'electricity' }
    if (/\b3\.0A\b/.test(upper)) return { tariff: '3.0TD', supplyType: 'electricity' }
    return undefined
}

function extractSupplyType(text: string): 'electricity' | 'gas' | undefined {
    const lower = text.toLowerCase()
    const gasIndicators = ['gas natural', 'suministro de gas', 'consumo de gas', 'termino fijo gas',
        'término fijo gas', 'canon irc', 'pcs', 'caudalimetro', 'caudalímetro', 'factor de conversión',
        'factor de conversion', 'm³', 'm3']
    const elecIndicators = ['electricidad', 'suministro eléctrico', 'suministro electrico',
        'energía activa', 'energia activa', 'potencia contratada', 'término de potencia',
        'termino de potencia', 'peaje de acceso']

    let gasScore = 0
    let elecScore = 0
    for (const ind of gasIndicators) if (lower.includes(ind)) gasScore++
    for (const ind of elecIndicators) if (lower.includes(ind)) elecScore++

    if (gasScore > elecScore && gasScore >= 2) return 'gas'
    if (elecScore > gasScore && elecScore >= 2) return 'electricity'
    return undefined
}

function extractAnnualConsumption(text: string, billingDays?: number): { value: number, isEstimated: boolean } | undefined {
    const lines = text.split('\n')
    const allText = text

    // 1. Look for explicit "consumo anual" or "consumo estimado anual"
    const annualPatterns = [
        new RegExp(`consumo\\s+(?:total\\s+)?anual[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`consumo\\s+anual\\s+estimado[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`estimaci[oó]n\\s+anual[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`previsi[oó]n\\s+anual[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`consumo\\s+anual[^\\d]*(${NUM})`, 'i'),
    ]

    for (const pattern of annualPatterns) {
        const m = allText.match(pattern)
        if (m) {
            const val = parseSpanishNumber(m[1])
            if (val > 100 && val < 10000000) return { value: val, isEstimated: false }
        }
    }

    // 2. Look for total consumption in kWh in the invoice and extrapolate
    // Common patterns: "Total energía activa: 1.234 kWh", "Consumo total: 500 kWh"
    const totalPatterns = [
        new RegExp(`total\\s+energ[ií]a\\s+(?:activa\\s+)?[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`consumo\\s+total[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`total\\s+consumo[^\\d]*(${NUM})\\s*kwh`, 'i'),
        new RegExp(`energ[ií]a\\s+consumida[^\\d]*(${NUM})\\s*kwh`, 'i'),
    ]

    for (const pattern of totalPatterns) {
        const m = allText.match(pattern)
        if (m) {
            const val = parseSpanishNumber(m[1])
            if (val > 0 && val < 10000000) {
                if (billingDays && billingDays > 0 && billingDays < 366) {
                    return { value: Math.round(val * 365 / billingDays), isEstimated: true }
                }
                // If no billing days, check if value looks like it could be annual already (> 1000 kWh)
                if (val > 2000) return { value: val, isEstimated: true }
            }
        }
    }

    // 3. Sum up period consumptions (P1 + P2 + P3...) in kWh
    let periodSum = 0
    let foundPeriods = 0
    for (const line of lines) {
        const periodMatch = line.match(new RegExp(`P[1-6][^\\d]*(${NUM})\\s*kWh`, 'i'))
        if (periodMatch) {
            periodSum += parseSpanishNumber(periodMatch[1])
            foundPeriods++
        }
    }

    if (foundPeriods >= 2 && periodSum > 0) {
        if (billingDays && billingDays > 0 && billingDays < 366) {
            return { value: Math.round(periodSum * 365 / billingDays), isEstimated: true }
        }
        if (periodSum > 2000) return { value: periodSum, isEstimated: true }
    }

    return undefined
}

function extractBillingDays(text: string): number | undefined {
    // "Periodo de facturación: 01/01/2026 - 28/02/2026" or "del 01/01/2026 al 28/02/2026"
    // Also "30 días" or "60 días"
    const daysMatch = text.match(/(\d{1,3})\s*d[ií]as/i)
    if (daysMatch) {
        const days = parseInt(daysMatch[1])
        if (days > 0 && days <= 366) return days
    }

    // Date range patterns
    const dateRangePatterns = [
        /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*(?:a|al|-|hasta)\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/,
        /per[ií]odo[^:]*:\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*[-–]\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i,
    ]

    for (const pattern of dateRangePatterns) {
        const m = text.match(pattern)
        if (m) {
            const d1 = parseInt(m[1]), m1 = parseInt(m[2]) - 1, y1 = parseInt(m[3] .length === 2 ? '20' + m[3] : m[3])
            const d2 = parseInt(m[4]), m2 = parseInt(m[5]) - 1, y2 = parseInt(m[6].length === 2 ? '20' + m[6] : m[6])
            const start = new Date(y1, m1, d1)
            const end = new Date(y2, m2, d2)
            const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            if (diff > 0 && diff <= 366) return diff
        }
    }

    return undefined
}

function extractPower(text: string): number | undefined {
    const patterns = [
        new RegExp(`potencia\\s+contratada[^\\d]*(${NUM})\\s*kw`, 'i'),
        new RegExp(`potencia[^\\d]*(${NUM})\\s*kw`, 'i'),
    ]
    for (const p of patterns) {
        const m = text.match(p)
        if (m) {
            const val = parseSpanishNumber(m[1])
            if (val > 0 && val < 1000) return val
        }
    }
    return undefined
}

function extractPowerPeriods(text: string): Record<string, number> {
    const powers: Record<string, number> = {}
    // Pattern: "P1: 4,6 kW" or "P1 4.600 kW" etc.
    const lines = text.split('\n')
    for (const line of lines) {
        if (!/potencia|kw/i.test(line)) continue
        for (let i = 1; i <= 6; i++) {
            const m = line.match(new RegExp(`P${i}[^\\d]*(${NUM})\\s*kW`, 'i'))
            if (m) {
                const val = parseSpanishNumber(m[1])
                if (val > 0 && val < 1000) powers[`P${i}`] = val
            }
        }
    }
    return powers
}

function extractConsumptionPeriods(text: string): Record<string, number> {
    const consumptions: Record<string, number> = {}
    const lines = text.split('\n')
    for (const line of lines) {
        if (!/consumo|energ|kwh|activa/i.test(line)) continue
        for (let i = 1; i <= 6; i++) {
            const m = line.match(new RegExp(`P${i}[^\\d]*(${NUM})\\s*kWh`, 'i'))
            if (m) {
                const val = parseSpanishNumber(m[1])
                if (val >= 0) consumptions[`P${i}`] = val
            }
        }
    }
    return consumptions
}

function extractTotalCost(text: string): number | undefined {
    const patterns = [
        new RegExp(`total\\s+factura[^\\d]*(${NUM})\\s*(?:€|EUR)`, 'i'),
        new RegExp(`importe\\s+total[^\\d]*(${NUM})\\s*(?:€|EUR)`, 'i'),
        new RegExp(`total\\s+a\\s+pagar[^\\d]*(${NUM})`, 'i'),
        new RegExp(`total[^\\d]*(${NUM})\\s*€`, 'i'),
    ]
    for (const p of patterns) {
        const m = text.match(p)
        if (m) {
            const val = parseSpanishNumber(m[1])
            if (val > 1 && val < 100000) return val
        }
    }
    return undefined
}

function extractSupplier(text: string): string | undefined {
    const upper = text.toUpperCase()
    for (const supplier of KNOWN_SUPPLIERS) {
        if (upper.includes(supplier.toUpperCase())) return supplier
    }
    return undefined
}

function extractConversionFactor(text: string): number | undefined {
    const m = text.match(new RegExp(`factor\\s+(?:de\\s+)?conversi[oó]n[^\\d]*(${NUM})`, 'i'))
    if (m) {
        const val = parseSpanishNumber(m[1])
        if (val > 5 && val < 15) return val
    }
    return undefined
}

export async function parseInvoiceLocally(file: File): Promise<ParsedInvoiceData | null> {
    // Only works with PDFs - images need AI
    if (!file.type.includes('pdf')) {
        return null
    }

    try {
        const { parsePdfText } = await import('@/shared/lib/pdf-utils')
        const { text } = await parsePdfText(file)
        console.log('Local parser: extracted text length', text.length)

        if (text.length < 50) {
            // PDF is probably scanned image, can't parse text
            console.log('Local parser: too little text, likely scanned PDF')
            return null
        }

        const result: ParsedInvoiceData = { _confidence: 0, _method: 'local' }
        let fieldsFound = 0
        const totalFields = 8 // cups, cif, tariff, consumption, power, cost, supplier, supply_type

        // CUPS
        const cups = extractCUPS(text)
        if (cups) { result.cups = cups; fieldsFound++ }

        // CIF
        const cif = extractCIF(text)
        if (cif) { result.cif = cif; fieldsFound++ }

        // Tariff type (also gives supply type)
        const tariffInfo = extractTariffType(text)
        if (tariffInfo) {
            result.tariff_type = tariffInfo.tariff
            result.supply_type = tariffInfo.supplyType
            fieldsFound += 2
        }

        // Supply type (if not detected from tariff)
        if (!result.supply_type) {
            const st = extractSupplyType(text)
            if (st) { result.supply_type = st; fieldsFound++ }
        }

        // Billing period days (needed for annual consumption estimation)
        const billingDays = extractBillingDays(text)
        if (billingDays) result.billing_days = billingDays

        // Annual consumption
        const consumption = extractAnnualConsumption(text, billingDays)
        if (consumption) {
            result.annual_consumption = consumption.value
            fieldsFound++
        }

        // Power (electricity only)
        if (result.supply_type !== 'gas') {
            const power = extractPower(text)
            if (power) { result.contracted_power = power; fieldsFound++ }

            // Power periods
            const powerPeriods = extractPowerPeriods(text)
            if (powerPeriods.P1) result.power_p1 = powerPeriods.P1
            if (powerPeriods.P2) result.power_p2 = powerPeriods.P2
            if (powerPeriods.P3) result.power_p3 = powerPeriods.P3
            if (powerPeriods.P4) result.power_p4 = powerPeriods.P4
            if (powerPeriods.P5) result.power_p5 = powerPeriods.P5
            if (powerPeriods.P6) result.power_p6 = powerPeriods.P6
        }

        // Consumption periods — convert raw kWh to percentages (0-100)
        const consPeriods = extractConsumptionPeriods(text)
        const consTotal = (consPeriods.P1 ?? 0) + (consPeriods.P2 ?? 0) + (consPeriods.P3 ?? 0)
            + (consPeriods.P4 ?? 0) + (consPeriods.P5 ?? 0) + (consPeriods.P6 ?? 0)
        if (consTotal > 0) {
            if (consPeriods.P1) result.p1_consumption_pct = Math.round((consPeriods.P1 / consTotal) * 10000) / 100
            if (consPeriods.P2) result.p2_consumption_pct = Math.round((consPeriods.P2 / consTotal) * 10000) / 100
            if (consPeriods.P3) result.p3_consumption_pct = Math.round((consPeriods.P3 / consTotal) * 10000) / 100
            if (consPeriods.P4) result.p4_consumption_pct = Math.round((consPeriods.P4 / consTotal) * 10000) / 100
            if (consPeriods.P5) result.p5_consumption_pct = Math.round((consPeriods.P5 / consTotal) * 10000) / 100
            if (consPeriods.P6) result.p6_consumption_pct = Math.round((consPeriods.P6 / consTotal) * 10000) / 100
        }

        // Total cost
        const totalCost = extractTotalCost(text)
        if (totalCost) {
            // Normalize to monthly
            if (billingDays && billingDays > 0) {
                result.current_cost = Math.round((totalCost / billingDays) * 30 * 100) / 100
            } else {
                result.current_cost = totalCost
            }
            fieldsFound++
        }

        // Supplier
        const supplier = extractSupplier(text)
        if (supplier) { result.current_supplier = supplier; fieldsFound++ }

        // Gas conversion factor
        if (result.supply_type === 'gas') {
            const cf = extractConversionFactor(text)
            if (cf) result.conversion_factor = cf
        }

        result._confidence = Math.round((fieldsFound / totalFields) * 100)

        console.log(`Local parser: found ${fieldsFound}/${totalFields} fields (confidence: ${result._confidence}%)`)

        // Only return if we found enough useful data (at least CUPS or consumption + tariff)
        if (fieldsFound >= 3) {
            return result
        }

        console.log('Local parser: not enough fields found, falling back to AI')
        return null
    } catch (err) {
        console.error('Local parser error:', err)
        return null
    }
}
