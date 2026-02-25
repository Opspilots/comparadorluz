import type {
    CalculationInput,
    CalculationResult,
    CalculationBreakdown,
} from '@/shared/types';
import { GAS_CONSTANTS } from '@/shared/constants';
import { calculateSavings } from './calculator';
import { findActiveRate } from './tariffUtils';

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

export function calculateGasAnnualCost(input: CalculationInput): CalculationResult {
    const {
        tariff_version,
        annual_consumption_kwh,
        current_cost_eur,
    } = input;

    const rates = tariff_version.tariff_rates || [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Fixed Term (Término Fijo)
    const fixedFeeRate = findActiveRate(rates as any, 'fixed_fee', undefined, today, tariff_version.contract_duration);
    const fixedFeeMonthly = fixedFeeRate?.price || 0;
    const fixedFeeAnnual = round(fixedFeeMonthly * 12);

    // 2. Variable Term (Término Variable)
    const energyRate = findActiveRate(rates as any, 'energy', undefined, today, tariff_version.contract_duration);
    const energyPrice = energyRate?.price || 0;
    const energyCostAnnual = round(annual_consumption_kwh * energyPrice);

    // 3. Taxes
    // Impuesto Hidrocarburos (IIEE)
    const hydrocarbonTax = round(annual_consumption_kwh * GAS_CONSTANTS.TAXES.HYDROCARBON);

    // Subtotal before IVA
    const subtotal = round(fixedFeeAnnual + energyCostAnnual + hydrocarbonTax);

    // IVA (Standard 21%)
    const iva = round(subtotal * GAS_CONSTANTS.TAXES.IVA_STANDARD);

    // Total
    const totalAnnual = round(subtotal + iva);
    const totalMonthly = round(totalAnnual / 12);

    // Breakdown
    const breakdown: CalculationBreakdown = {
        energy_cost: energyCostAnnual, // Variable Term
        power_cost: 0,                 // Gas does not have power cost
        fixed_fee: fixedFeeAnnual,     // Fixed Term
        subtotal,
        taxes: round(hydrocarbonTax + iva),
        total: totalAnnual,
        tax_breakdown: {
            iva,
            hydrocarbon_tax: hydrocarbonTax
        },
        period_breakdown: {
            'P1': { kwh: annual_consumption_kwh, cost: energyCostAnnual }
        }
    };

    // Savings
    const savings = calculateSavings(totalAnnual, current_cost_eur);

    return {
        annual_cost_eur: totalAnnual,
        monthly_cost_eur: totalMonthly,
        breakdown,
        ...savings
    };
}
