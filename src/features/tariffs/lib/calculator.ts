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
    TariffVersion,
    TariffRate,
    CalculationInput,
    CalculationResult,
    CalculationBreakdown,
} from '@/shared/types';
import { calculateGasAnnualCost } from './gas-calculator';
import { findActiveRate } from './tariffUtils';

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
 * Default consumption distribution for 2.0TD tariff (3 energy periods)
 * Note: 2.0TD has 3 ENERGY periods (P1, P2, P3) but only 2 POWER periods
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
        // Sum all P1-P6 values
        const total = Object.values(customDistribution).reduce((sum, val) => sum + (val || 0), 0);

        // If total is close to 100, use custom distribution
        if (total > 50 && Math.abs(total - 100) < 5) {
            return customDistribution as { [key: string]: number };
        }

        // If user provided some values but they don't sum to 100, log a warning
        if (total > 0) {
            console.warn(`Consumption distribution sum is ${total}%, expected ~100%. Using defaults.`);
        }
    }

    // Default distributions by tariff type
    if (tariffType === '2.0TD') {
        return DEFAULT_CONSUMPTION_DISTRIBUTION_2P;
    }

    // 3.0TD, 6.1TD, etc. use 3 periods
    return DEFAULT_CONSUMPTION_DISTRIBUTION;
}

function getEnergyPrices(
    tariff_version: TariffVersion,
    market_prices?: Array<{ indicator_id: number; price: number }>
): Map<string, number> {
    const prices = new Map<string, number>();
    const rates = tariff_version.tariff_rates || [];
    const today = new Date().toISOString().split('T')[0];

    // If indexed, calculate price from market baseline + margin
    if (tariff_version.is_indexed && market_prices) {
        rates.filter((r: TariffRate) => r.item_type === 'energy').forEach((r: TariffRate) => {
            if (r.period) {
                // Check if this specific rate version is active for today
                const activeRate = findActiveRate(rates as any, 'energy', r.period, today, tariff_version.contract_duration);
                if (activeRate?.id !== r.id) return;

                // Simplified indicator mapping for P1-P3
                const indicatorId = r.period === 'P1' ? 1013 : r.period === 'P2' ? 1014 : 1015;
                const mPrice = market_prices.find(mp => mp.indicator_id === indicatorId)?.price || 0;

                // mPrice is often in EUR/MWh from ESIOS, convert to EUR/kWh
                const finalPrice = (mPrice / 1000) + (r.margin || 0);
                prices.set(r.period, finalPrice);
            }
        });

        if (prices.size > 0) return prices;
    }

    // Fallback/Standard: find best active prices for each period
    const energyRateEntries = rates.filter(r => r.item_type === 'energy');
    const periods = Array.from(new Set(energyRateEntries.map(r => r.period).filter(Boolean))) as string[];

    periods.forEach(period => {
        const activeRate = findActiveRate(rates as any, 'energy', period, today, tariff_version.contract_duration);
        if (activeRate && activeRate.price !== null) {
            prices.set(period, activeRate.price);
        }
    });

    return prices;
}

/**
 * Get all power price components grouped by period
 */
function getPowerPrices(rates: TariffRate[], contractDuration: number | null): Map<string, number> {
    const prices = new Map<string, number>();
    const today = new Date().toISOString().split('T')[0];

    const powerRateEntries = rates.filter(r => r.item_type === 'power');
    const periods = Array.from(new Set(powerRateEntries.map(r => r.period).filter(Boolean))) as string[];

    periods.forEach(period => {
        const activeRate = findActiveRate(rates as any, 'power', period, today, contractDuration);
        if (activeRate && activeRate.price !== null) {
            prices.set(period, activeRate.price);
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
        // Skip periods with 0% distribution
        if (percentage === 0) continue;

        const price = energyPrices.get(period);
        if (price === undefined) {
            // Skip this period instead of throwing - tariff may not have all periods configured
            console.warn(`Skipping period ${period} - no energy price configured for this tariff`);
            continue;
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
 * @param rates - Tariff rates
 * @param contractDuration - Contract duration in months
 * @returns Annual fixed fee cost
 */
export function calculateFixedFee(rates: TariffRate[], contractDuration: number | null): number {
    const today = new Date().toISOString().split('T')[0];
    const activeRate = findActiveRate(rates as any, 'fixed_fee', undefined, today, contractDuration);

    if (!activeRate || !activeRate.price) {
        return 0;
    }

    // Convert monthly to annual
    return round(activeRate.price * 12);
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
export function calculateElectricityAnnualCost(input: CalculationInput): CalculationResult {
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
        contracted_power_p6_kw,
        current_cost_eur,
        market_prices
    } = input;

    if (!tariff_version.tariff_rates || tariff_version.tariff_rates.length === 0) {
        throw new Error('Tariff version has no rates');
    }

    // 1. Get Consumption Distribution (P1-P6)
    const distribution = getConsumptionDistribution(
        tariff_version.tariff_type,
        consumption_distribution
    );

    // 2. Extract price components
    const energyPrices = getEnergyPrices(tariff_version, market_prices);
    const powerPrices = getPowerPrices(tariff_version.tariff_rates || [], tariff_version.contract_duration ?? null);

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

    // 5. CALCULATE PENALTIES
    const reactivePenalty = reactive_energy_kvarh * 0.041554; // Avg price EUR/kVarh

    // Excess Power (Maximeter) - Simplified Model for 3.0TD/6.1TD
    // Rule: Penalty if Demand > 105% of Contracted Power
    // Formula: (Pd - 1.05 * Pc) * KP
    // KP approx 3.36 EUR/kW/month for standard High Voltage / >50kW
    const EXCESS_POWER_COEFFICIENT = 3.361213;

    let excessPowerPenalty = 0;
    if (max_demand_kw > 0) {
        // Find the maximum contracted power across all periods
        const maxContractedPower = Math.max(...Object.values(powerInputs).filter(p => p > 0));

        // Apply penalty if max demand exceeds 105% of the highest contracted power
        const limit = maxContractedPower * 1.05;
        if (max_demand_kw > limit) {
            const excess = max_demand_kw - limit;
            // Monthly penalty * 12 months
            excessPowerPenalty = excess * EXCESS_POWER_COEFFICIENT * 12;
        }
    }
    excessPowerPenalty = round(excessPowerPenalty);

    // 6. FIXED FEES & EXTRAS
    const fixedFee = calculateFixedFee(tariff_version.tariff_rates || [], tariff_version.contract_duration ?? null);
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

    // 9. Calculate savings compared to actual current cost if provided
    const savings = calculateSavings(totalAnnual, current_cost_eur);

    return {
        annual_cost_eur: totalAnnual,
        monthly_cost_eur: totalMonthly,
        breakdown,
        ...savings
    };
}

/**
 * Unified Calculation Function
 * Delegates to specific calculator based on tariff type
 */
export function calculateAnnualCost(input: CalculationInput): CalculationResult {
    const { tariff_version } = input;

    // Check for Gas Tariffs
    if (['RL.1', 'RL.2', 'RL.3', 'RL.4'].includes(tariff_version.tariff_type)) {
        return calculateGasAnnualCost(input);
    }

    // Default to Electricity
    return calculateElectricityAnnualCost(input);
}
