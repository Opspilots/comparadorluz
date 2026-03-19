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
    CalculationResult,
    GroupedComparisonResult
} from '@/shared/types'

export interface RankingOptions {
    mode: ComparisonMode
    currentAnnualCostEur?: number
    // Market prices for indexed tariff calculations (PVPC/pool)
    marketPrices?: Array<{ indicator_id: number; price: number }>
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
    const { mode, currentAnnualCostEur, marketPrices } = options

    // 1. Calculate costs for all tariffs
    const results: ComparisonResult[] = []

    const today = new Date().toISOString().split('T')[0];

    tariffs.forEach((tariff) => {
        // 1a. Filter components by current validity date and exclude null-priced rates
        const allComponents = (tariff.tariff_rates || []).filter(c => {
            // If component has no validity dates, it's always valid
            if (!c.valid_from && !c.valid_to) { /* valid */ }
            else if (c.valid_from && c.valid_from > today) return false;
            else if (c.valid_to && c.valid_to < today) return false;
            // Skip rates with null price (unless they have a formula for indexed tariffs)
            if (c.price === null && c.price === undefined && !c.price_formula) return false;
            return true;
        });

        // 1b. Identify available durations in components
        const durations = new Set<number>();
        let hasSpecificDuration = false;

        allComponents.forEach(c => {
            if (c.contract_duration) {
                durations.add(c.contract_duration);
                hasSpecificDuration = true;
            }
        });

        // If no specific durations are found, treat as a single "standard" tariff (duration = null or tariff default)
        // If specific durations found, we iterate over them. 
        // We also need to consider if there are "mixed" components? 
        // Assumption: If a tariff has ANY duration-specific prices, we should calculate for those durations.
        // If it also has generic prices (duration=null), they apply to ALL durations.

        const scenarios: Array<{ duration: number | null, label: string }> = [];

        if (durations.size > 0) {
            Array.from(durations).sort((a, b) => a - b).forEach(d => {
                scenarios.push({ duration: d, label: `${d} Meses` });
            });
        } else {
            scenarios.push({ duration: tariff.contract_duration || null, label: 'Standard' });
        }

        scenarios.forEach(scenario => {
            try {
                // Filter components: specific duration OR generic (null)
                // If scenario.duration is null, we take everything (legacy behavior) or just generic? 
                // Legacy behavior: take all. But now we might have 12m and 24m prices.
                // If we differ from legacy, we should filter.

                let activeComponents = allComponents;
                if (scenario.duration) {
                    activeComponents = allComponents.filter(c =>
                        !c.contract_duration || c.contract_duration === scenario.duration
                    );
                }

                // Skip if no rates match this scenario or no usable energy prices exist
                if (activeComponents.length === 0) return;
                // For indexed tariffs, energy rates may have price=null with margin instead
                const hasDirectPrices = activeComponents.some(c => c.item_type === 'energy' && c.price !== null && c.price !== undefined);
                const hasIndexedRates = tariff.is_indexed && activeComponents.some(c => c.item_type === 'energy');
                if (!hasDirectPrices && !hasIndexedRates) return;

                // Create a virtual tariff version for this scenario
                const scenarioTariff: TariffVersion = {
                    ...tariff,
                    contract_duration: scenario.duration || tariff.contract_duration, // Update duration
                    tariff_name: scenario.duration && hasSpecificDuration
                        ? `${tariff.tariff_name} (${scenario.label})`
                        : tariff.tariff_name,
                    tariff_rates: activeComponents
                };

                const calcResult: CalculationResult = calculateAnnualCost({
                    tariff_version: scenarioTariff,
                    annual_consumption_kwh: input.annual_consumption_kwh,
                    contracted_power_kw: input.contracted_power_kw,
                    consumption_distribution: input.consumption_distribution,
                    // Pass advanced fields
                    reactive_energy_kvarh: input.reactive_energy_kvarh,
                    max_demand_kw: input.max_demand_kw,
                    meter_rental_eur_month: input.meter_rental_eur_month,
                    contracted_power_p1_kw: input.contracted_power_p1_kw,
                    contracted_power_p2_kw: input.contracted_power_p2_kw,
                    contracted_power_p3_kw: input.contracted_power_p3_kw,
                    contracted_power_p4_kw: input.contracted_power_p4_kw,
                    contracted_power_p5_kw: input.contracted_power_p5_kw,
                    contracted_power_p6_kw: input.contracted_power_p6_kw,
                    current_cost_eur: currentAnnualCostEur,
                    market_prices: marketPrices,
                })

                // Calculate commission from tariff's own commission settings
                const tariffCommissionType = tariff.commission_type || 'percentage';
                const tariffCommissionValue = tariff.commission_value ?? 0;
                // Calculate commission on subtotal (pre-tax), not on IVA-inclusive total
                const commissionBase = calcResult.breakdown?.subtotal ?? calcResult.annual_cost_eur
                const commissionEur = tariffCommissionType === 'fixed'
                    ? tariffCommissionValue
                    : Math.round((commissionBase * (tariffCommissionValue / 100)) * 100) / 100

                results.push({
                    id: crypto.randomUUID(), // Temporary ID for UI
                    comparison_id: 'temp',
                    company_id: tariff.company_id,
                    tariff_version_id: tariff.id,
                    rank: 0, // Assigned after sorting
                    annual_cost_eur: calcResult.annual_cost_eur,
                    monthly_cost_eur: calcResult.monthly_cost_eur,
                    annual_savings_eur: calcResult.annual_savings_eur,
                    savings_pct: calcResult.savings_pct,
                    commission_eur: commissionEur,
                    calculation_breakdown: calcResult.breakdown,
                    created_at: new Date().toISOString(),
                    tariff_version: scenarioTariff, // Pass the virtual tariff with correct name/duration
                })
            } catch (err) {
                console.warn(`Skipping tariff ${tariff.tariff_name} scenario ${scenario.duration} due to calculation error:`, err)
            }
        });
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

/**
 * Groups flat ComparisonResult[] by tariff, consolidating duration variants
 * into a single entry with selectable duration options.
 * Durations within each group are sorted ascending (shortest first).
 * Groups are sorted by the best rank among their options.
 */
export function groupResultsByTariff(
    results: ComparisonResult[]
): GroupedComparisonResult[] {
    const map = new Map<string, GroupedComparisonResult>();

    results.forEach(res => {
        const tv = res.tariff_version;
        if (!tv) return;

        // Group by supplier name and base name to merge versions
        const sName = tv.supplier_name || '';
        const bName = tv.tariff_name?.replace(/\s*\(\d+ Meses\)\s*$/, '') || '';
        const groupKey = `${sName}_${bName}`;

        const duration = tv.contract_duration ?? null;
        const label = duration ? `${duration} Meses` : 'Estándar';

        if (!map.has(groupKey)) {
            map.set(groupKey, {
                tariff_version_id: res.tariff_version_id,
                supplier_name: sName,
                tariff_name: bName,
                tariff_version: tv,
                duration_options: [],
                best_rank: res.rank,
            });
        }

        const group = map.get(groupKey)!;

        // Ensure we only have one result per duration (pick the best rank)
        const existing = group.duration_options.find(opt => opt.duration === duration);
        if (!existing || res.rank < existing.result.rank) {
            if (existing) {
                group.duration_options = group.duration_options.filter(opt => opt.duration !== duration);
            }
            group.duration_options.push({ duration, label, result: res });
        }

        // Update group-level info if this is the best rank among all options
        if (res.rank < group.best_rank) {
            group.best_rank = res.rank;
            group.tariff_version = tv;
            group.tariff_version_id = res.tariff_version_id;
        }
    });

    // Sort durations within each group: shortest first, null last
    for (const group of map.values()) {
        group.duration_options.sort((a, b) => {
            if (a.duration === null && b.duration === null) return 0;
            if (a.duration === null) return 1;
            if (b.duration === null) return -1;
            return a.duration - b.duration;
        });
    }

    // Sort groups by best_rank
    return Array.from(map.values()).sort((a, b) => a.best_rank - b.best_rank);
}
