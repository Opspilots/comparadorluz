/**
 * Tariff Ranking Logic
 * 
 * This module implements the ranking algorithm for comparison results.
 * It supports two modes:
 * 1. CLient-first: Sort by lowest annual cost.
 * 2. Commercial-first: Sort by highest commission.
 */

import { calculateAnnualCost } from '@/features/tariffs/lib/calculator'
import type {
    TariffVersion,
    ComparisonInput,
    ComparisonResult,
    ComparisonMode,
    CalculationResult
} from '@/shared/types'

export interface RankingOptions {
    mode: ComparisonMode
    currentAnnualCostEur?: number
    // For commission calculation (simplified for MVP)
    commissionPct?: number
}

/**
 * Ranks available tariffs for a given consumption profile.
 * 
 * @param tariffs - List of active tariff versions
 * @param input - Consumption and power data
 * @param options - Ranking mode and current cost for savings calc
 * @returns Sorted list of comparison results
 */
export function rankTariffs(
    tariffs: TariffVersion[],
    input: ComparisonInput,
    options: RankingOptions
): ComparisonResult[] {
    const { mode, currentAnnualCostEur, commissionPct = 10 } = options

    // 1. Calculate costs for all tariffs
    const results: ComparisonResult[] = []

    tariffs.forEach((tariff) => {
        try {
            const calcResult: CalculationResult = calculateAnnualCost({
                tariff_version: tariff,
                annual_consumption_kwh: input.annual_consumption_kwh,
                contracted_power_kw: input.contracted_power_kw,
                consumption_distribution: input.consumption_distribution,
                // Pass advanced fields
                reactive_energy_kvarh: input.reactive_energy_kvarh,
                max_demand_kw: input.max_demand_kw,
                meter_rental_eur_month: input.meter_rental_eur_month, // Will use default if undefined
                contracted_power_p1_kw: input.contracted_power_p1_kw,
                contracted_power_p2_kw: input.contracted_power_p2_kw,
                contracted_power_p3_kw: input.contracted_power_p3_kw,
                contracted_power_p4_kw: input.contracted_power_p4_kw,
                contracted_power_p5_kw: input.contracted_power_p5_kw,
                contracted_power_p6_kw: input.contracted_power_p6_kw,
            })

            // Calculate annual savings if current cost is known
            const annualSavings = currentAnnualCostEur
                ? Math.round((currentAnnualCostEur - calcResult.annual_cost_eur) * 100) / 100
                : undefined

            const savingsPct = currentAnnualCostEur && annualSavings !== undefined
                ? Math.round((annualSavings / currentAnnualCostEur) * 100 * 100) / 100
                : undefined

            // Calculate commission (simplified: % of annual cost or fixed fee)
            // In our real logic, this would fetch from commission_rules
            const commissionEur = Math.round((calcResult.annual_cost_eur * (commissionPct / 100)) * 100) / 100

            results.push({
                id: crypto.randomUUID(), // Temporary ID for UI
                comparison_id: 'temp',
                company_id: tariff.company_id,
                tariff_version_id: tariff.id,
                rank: 0, // Assigned after sorting
                annual_cost_eur: calcResult.annual_cost_eur,
                monthly_cost_eur: calcResult.monthly_cost_eur,
                annual_savings_eur: annualSavings,
                savings_pct: savingsPct,
                commission_eur: commissionEur,
                calculation_breakdown: calcResult.breakdown,
                created_at: new Date().toISOString(),
                tariff_version: tariff,
            })
        } catch (err) {
            console.warn(`Skipping tariff ${tariff.tariff_name} due to calculation error:`, err)
        }
    })

    // 2. Sort based on mode
    results.sort((a, b) => {
        if (mode === 'client_first') {
            return a.annual_cost_eur - b.annual_cost_eur
        } else {
            // Commercial first: highest commission wins
            return (b.commission_eur || 0) - (a.commission_eur || 0)
        }
    })

    // 3. Assign rank
    results.forEach((res, idx) => {
        res.rank = idx + 1
    })

    return results
}
