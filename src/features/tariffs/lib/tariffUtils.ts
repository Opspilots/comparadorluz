import { TariffRate } from '@/types/tariff';

/**
 * Finds the active rate for a given period and date.
 * 
 * Duration matching is bidirectional:
 * - If contractDuration is null/undefined, accept ALL rates regardless of their duration.
 * - If the rate's duration is null/undefined, it acts as a universal rate.
 * - Exact duration matches get a score boost.
 * 
 * Scoring system for date matching:
 * - 40: Explicit date match (date is between valid_from and valid_to).
 * - 30: Future rate (valid_from > date).
 * - 20: Past rate (valid_to < date).
 * - 10: Universal rate (no dates).
 */
export function findActiveRate(
    rates: TariffRate[],
    itemType: string,
    period: string | undefined,
    targetDate: string = new Date().toISOString().split('T')[0],
    contractDuration: number | null = null
): TariffRate | undefined {
    // Step 1: Filter by item type and period
    const periodRates = rates.filter(r =>
        r.item_type === itemType && (r.period === period || (!r.period && !period))
    );

    if (periodRates.length === 0) return undefined;

    // Step 2: Filter by duration (bidirectional null acceptance)
    let candidateRates = periodRates.filter(r => {
        const rDur = r.contract_duration;
        // Accept if either side is null/undefined, or if they match exactly
        if (contractDuration == null || rDur == null) return true;
        return rDur === contractDuration;
    });

    // Fallback: if no candidates matched, use all period rates
    if (candidateRates.length === 0) {
        candidateRates = periodRates;
    }

    // Step 3: Score by date proximity and duration preference
    let bestRate: TariffRate | null = null;
    let currentBestScore = -1;

    candidateRates.forEach(r => {
        let score = 0;
        const vf = r.valid_from;
        const vt = r.valid_to;

        // Date scoring
        if (!vf && !vt) score = 10;
        else if (vf && vt && vf <= targetDate && vt >= targetDate) score = 40;
        else if (vf && !vt && vf <= targetDate) score = 40;
        else if (vf && vf > targetDate) score = 30;
        else if (vt && vt < targetDate) score = 20;
        else score = 10;

        // Boost for exact duration match
        if (contractDuration != null && r.contract_duration === contractDuration) {
            score += 5;
        }

        if (score > currentBestScore) {
            currentBestScore = score;
            bestRate = r;
        } else if (score === currentBestScore && bestRate) {
            const rVf = r.valid_from || '';
            const bVf = bestRate.valid_from || '';
            if (rVf > bVf) {
                bestRate = r;
            }
        }
    });

    return bestRate || undefined;
}

/**
 * Convert a power price to its monthly equivalent for display purposes.
 * The DB may store values as annual (EUR/kW/year) or daily (EUR/kW/day).
 * All display should be in EUR/kW/month.
 */
export function toPowerMonthly(price: number, unit: string | undefined | null): number {
    const u = (unit || '').toUpperCase();
    if (u.includes('YEAR') || u.includes('AÑO') || u.includes('ANO')) return price / 12;
    if (u.includes('DAY') || u.includes('DIA') || u.includes('DÍA')) return price * (365 / 12);
    return price; // already monthly
}

/**
 * Checks if there are multiple rates (history) for a given period and item type.
 */
export function hasRateHistory(
    rates: TariffRate[],
    itemType: string,
    period: string | undefined,
    contractDuration: number | null = null
): boolean {
    return rates.filter(r => {
        const itemMatch = r.item_type === itemType && (r.period === period || (!r.period && !period));
        const rDur = r.contract_duration;
        const durationMatch = contractDuration == null || rDur == null || rDur === contractDuration;
        return itemMatch && durationMatch;
    }).length > 1;
}
