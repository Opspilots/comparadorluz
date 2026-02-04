/**
 * Core Tariff Calculation Engine
 * 
 * This module implements the MVP calculation logic for energy tariffs with:
 * - Simplified period distribution (P1/P2/P3)
 * - Standard Spanish tax rates (IVA 21%, Electricity Tax 5.11%)
 * - Reproducible calculations (bit-for-bit identical results)
 * 
 * IMPORTANT: All monetary calculations use 2 decimal precision.
 * Edge case handling: zero consumption returns minimum fees only.
 */

import type {

    TariffComponent,
    CalculationInput,
    CalculationResult,
    CalculationBreakdown,
} from '@/shared/types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Standard Spanish tax rates for electricity
 */
export const TAX_RATES = {
    /** IVA (Value Added Tax) - 21% */
    IVA: 0.21,
    /** Impuesto sobre la Electricidad - 5.11% */
    ELECTRICITY_TAX: 0.0511,
} as const;

/**
 * Default consumption distribution for 3-period tariffs when not specified
 * Based on typical Spanish business consumption patterns
 */
export const DEFAULT_CONSUMPTION_DISTRIBUTION = {
    P1: 40,  // Peak (40%)
    P2: 35,  // Mid (35%)
    P3: 25,  // Off-peak (25%)
} as const;

/**
 * Default consumption distribution for 2-period tariffs
 */
export const DEFAULT_CONSUMPTION_DISTRIBUTION_2P = {
    P1: 29,  // Peak (~29%)
    P2: 26,  // Flat (~26%)
    P3: 45,  // Valley (~45%)
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Round to 2 decimal places (standard for EUR)
 */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Get consumption distribution based on tariff type
 * If user provides custom distribution, use it. Otherwise use defaults.
 */
function getConsumptionDistribution(
    tariffType: string,
    customDistribution?: { [key: string]: number }
): { [key: string]: number } {
    if (customDistribution) {
        const total = (customDistribution.P1 || 0) + (customDistribution.P2 || 0) + (customDistribution.P3 || 0);
        if (Math.abs(total - 100) < 0.01) {
            return customDistribution as { [key: string]: number };
        }
    }

    // Default distributions by tariff type
    if (tariffType === '2.0TD') {
        return DEFAULT_CONSUMPTION_DISTRIBUTION_2P;
    }

    // 3.0TD, 6.1TD, etc. use 3 periods
    return DEFAULT_CONSUMPTION_DISTRIBUTION;
}

/**
 * Extract component by type and period
 */
function getComponent(
    components: TariffComponent[],
    type: string,
    period?: string
): TariffComponent | undefined {
    return components.find(
        (c) => c.component_type === type && (!period || c.period === period)
    );
}

/**
 * Get all energy price components grouped by period
 */
function getEnergyPrices(components: TariffComponent[]): Map<string, number> {
    const prices = new Map<string, number>();

    components
        .filter((c) => c.component_type === 'energy_price')
        .forEach((c) => {
            if (c.period && c.price_eur_kwh !== undefined) {
                prices.set(c.period, c.price_eur_kwh);
            }
        });

    return prices;
}

/**
 * Get all power price components grouped by period
 */
function getPowerPrices(components: TariffComponent[]): Map<string, number> {
    const prices = new Map<string, number>();

    components
        .filter((c) => c.component_type === 'power_price')
        .forEach((c) => {
            if (c.period && c.price_eur_kw_year !== undefined) {
                prices.set(c.period, c.price_eur_kw_year);
            }
        });

    return prices;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate energy component cost (variable part)
 * 
 * Formula: Σ(consumption_per_period * price_per_period)
 * 
 * @param energyPrices - Map of period → EUR/kWh
 * @param totalConsumption - Annual consumption in kWh
 * @param distribution - Consumption distribution by period (percentages)
 * @returns Object with total cost and period breakdown
 */
export function calculateEnergyComponent(
    energyPrices: Map<string, number>,
    totalConsumption: number,
    distribution: { [key: string]: number }
): { total: number; breakdown: Record<string, { kwh: number; cost: number }> } {
    const breakdown: Record<string, { kwh: number; cost: number }> = {};
    let total = 0;

    for (const [period, percentage] of Object.entries(distribution)) {
        const price = energyPrices.get(period);
        if (price === undefined) {
            throw new Error(`Missing energy price for period ${period}`);
        }

        const kwh = (totalConsumption * percentage) / 100;
        const cost = round(kwh * price);

        breakdown[period] = { kwh: round(kwh), cost };
        total += cost;
    }

    return { total: round(total), breakdown };
}

/**
 * Calculate power component cost (fixed part based on contracted power)
 * 
 * Formula: Σ(contracted_power * price_per_period)
 * In Spain, power prices are annual (EUR/kW/year)
 * 
 * @param powerPrices - Map of period → EUR/kW/year
 * @param contractedPower - Contracted power in kW
 * @returns Total annual power cost
 */
export function calculatePowerComponent(
    powerPrices: Map<string, number>,
    contractedPowers: { [key: string]: number }
): number {
    let total = 0;

    for (const [period, price] of powerPrices) {
        const powerKw = contractedPowers[period];
        if (powerKw !== undefined) {
            total += powerKw * price;
        }
    }

    return round(total);
}

/**
 * Calculate fixed fees (monthly subscription fees)
 * 
 * @param components - Tariff components
 * @returns Annual fixed fee cost
 */
export function calculateFixedFee(components: TariffComponent[]): number {
    const fixedFeeComponent = getComponent(components, 'fixed_fee');

    if (!fixedFeeComponent || !fixedFeeComponent.fixed_price_eur_month) {
        return 0;
    }

    // Convert monthly to annual
    return round(fixedFeeComponent.fixed_price_eur_month * 12);
}

/**
 * Apply Spanish electricity taxes
 * 
 * Tax calculation order (as per Spanish regulation):
 * 1. Electricity Tax (5.11%) on subtotal
 * 2. IVA (21%) on (subtotal + electricity tax)
 * 
 * @param subtotal - Pre-tax subtotal
 * @returns Object with total taxes and breakdown
 */
export function applyTaxes(subtotal: number): {
    total: number;
    breakdown: { iva: number; electricity_tax: number };
} {
    // Step 1: Apply Electricity Tax
    const electricityTax = round(subtotal * TAX_RATES.ELECTRICITY_TAX);

    // Step 2: Apply IVA on (subtotal + electricity tax)
    const baseForIVA = subtotal + electricityTax;
    const iva = round(baseForIVA * TAX_RATES.IVA);

    const total = round(electricityTax + iva);

    return {
        total,
        breakdown: { iva, electricity_tax: electricityTax },
    };
}

/**
 * Calculate savings compared to current tariff
 * 
 * @param newCost - Calculated annual cost of new tariff
 * @param currentCost - Current annual cost (if known)
 * @returns Savings object with absolute and percentage values
 */
export function calculateSavings(
    newCost: number,
    currentCost?: number
): { annual_savings_eur?: number; savings_pct?: number } {
    if (!currentCost || currentCost <= 0) {
        return {};
    }

    const savings = round(currentCost - newCost);
    const savingsPct = round((savings / currentCost) * 100);

    return {
        annual_savings_eur: savings,
        savings_pct: savingsPct,
    };
}

/**
 * Main calculation function
 * 
 * Calculates total annual cost for a given tariff and consumption profile.
 * This is the core business logic of the platform - must be 100% reproducible.
 * 
 * @param input - Calculation input (tariff + consumption data)
 * @returns Calculation result with breakdown
 * 
 * @throws Error if required tariff components are missing
 * 
 * @example
 * const result = calculateAnnualCost({
 *   tariff_version: tariff,
 *   annual_consumption_kwh: 5000,
 *   contracted_power_kw: 10
 * });
 * // => { annual_cost_eur: 1234.56, monthly_cost_eur: 102.88, breakdown: {...} }
 */
export function calculateAnnualCost(input: CalculationInput): CalculationResult {
    const {
        tariff_version,
        annual_consumption_kwh,
        contracted_power_kw,
        consumption_distribution,
        reactive_energy_kvarh = 0,
        max_demand_kw = 0,
        meter_rental_eur_month = 0.81, // Standard average rental
        // Granular power inputs (fallback to contracted_power_kw if undefined)
        contracted_power_p1_kw,
        contracted_power_p2_kw,
        contracted_power_p3_kw,
        contracted_power_p4_kw,
        contracted_power_p5_kw,
        contracted_power_p6_kw
    } = input;

    if (!tariff_version.components || tariff_version.components.length === 0) {
        throw new Error('Tariff version has no components');
    }

    // 1. Get Consumption Distribution (P1-P6)
    const distribution = getConsumptionDistribution(
        tariff_version.tariff_type,
        consumption_distribution
    );

    // 2. Extract price components
    const energyPrices = getEnergyPrices(tariff_version.components);
    const powerPrices = getPowerPrices(tariff_version.components);

    if (energyPrices.size === 0) {
        throw new Error('No energy prices found in tariff');
    }

    // 3. ENERGY COST CALCULATION
    const energyResult = calculateEnergyComponent(
        energyPrices,
        annual_consumption_kwh,
        distribution
    );
    const energyCost = energyResult.total;

    // 4. POWER COST CALCULATION
    // If granular power is provided, use it. Otherwise assume same power for all periods.
    const powerInputs = {
        P1: contracted_power_p1_kw ?? contracted_power_kw,
        P2: contracted_power_p2_kw ?? contracted_power_kw,
        P3: contracted_power_p3_kw ?? contracted_power_kw,
        P4: contracted_power_p4_kw ?? contracted_power_kw,
        P5: contracted_power_p5_kw ?? contracted_power_kw,
        P6: contracted_power_p6_kw ?? contracted_power_kw,
    };

    // For 2.0TD, we only care about P1 and P2 usually, but we calculate what's priced
    const powerCost = calculatePowerComponent(powerPrices, powerInputs);

    // 5. CALCULATE PENALTIES (Mock implementation for now)
    // In a real scenario, this requires defining penalty rates or excess usage
    const reactivePenalty = reactive_energy_kvarh * 0.041554; // Avg price EUR/kVarh
    const excessPowerPenalty = 0; // Requires complex formula 

    // 6. FIXED FEES & EXTRAS
    const fixedFee = calculateFixedFee(tariff_version.components);
    const meterRental = round(meter_rental_eur_month * 12); // Add meter rental

    // 7. SUBTOTAL & TAXES
    const subtotal = round(energyCost + powerCost + fixedFee + meterRental + reactivePenalty + excessPowerPenalty);
    const taxResult = applyTaxes(subtotal);

    // 8. FINAL TOTAL
    const totalAnnual = round(subtotal + taxResult.total);
    const totalMonthly = round(totalAnnual / 12);

    // Breakdown
    const breakdown: CalculationBreakdown = {
        energy_cost: energyCost,
        power_cost: powerCost,
        fixed_fee: fixedFee,
        subtotal,
        taxes: taxResult.total,
        total: totalAnnual,
        tax_breakdown: taxResult.breakdown,
        period_breakdown: energyResult.breakdown,
        penalties: {
            reactive: round(reactivePenalty),
            excess_power: round(excessPowerPenalty)
        }
    };

    return {
        annual_cost_eur: totalAnnual,
        monthly_cost_eur: totalMonthly,
        breakdown,
    };
}
