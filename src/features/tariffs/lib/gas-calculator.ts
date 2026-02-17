import type {
    CalculationInput,
    CalculationResult,
    CalculationBreakdown,
} from '@/shared/types';
import { GAS_CONSTANTS } from '@/shared/constants';

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

export function calculateGasAnnualCost(input: CalculationInput): CalculationResult {
    const {
        tariff_version,
        annual_consumption_kwh,
        current_cost_eur,
    } = input;

    const components = tariff_version.tariff_components || [];

    // 1. Fixed Term (Término Fijo)
    const fixedFeeComponent = components.find(c => c.component_type === 'fixed_fee');
    const fixedFeeMonthly = fixedFeeComponent?.fixed_price_eur_month || 0;
    const fixedFeeAnnual = round(fixedFeeMonthly * 12);

    // 2. Variable Term (Término Variable)
    const energyComponent = components.find(c => c.component_type === 'energy_price');
    const energyPrice = energyComponent?.price_eur_kwh || 0;
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
            electricity_tax: hydrocarbonTax // Repurposing field for Hydrocarbon tax
        },
        period_breakdown: {
            'P1': { kwh: annual_consumption_kwh, cost: energyCostAnnual }
        }
    };

    // Savings
    let savings = {};
    if (current_cost_eur && current_cost_eur > 0) {
        const annualSavings = round(current_cost_eur - totalAnnual);
        const savingsPct = round((annualSavings / current_cost_eur) * 100);
        savings = {
            annual_savings_eur: annualSavings,
            savings_pct: savingsPct
        };
    }

    return {
        annual_cost_eur: totalAnnual,
        monthly_cost_eur: totalMonthly,
        breakdown,
        ...savings
    };
}
