import { describe, it, expect } from 'vitest';
import { calculateGasAnnualCost } from './gas-calculator';
import { calculateAnnualCost } from './calculator';
import { CalculationInput, TariffVersion } from '@/shared/types';
import { GAS_CONSTANTS } from '@/shared/constants';

describe('Gas Calculator', () => {
    const mockGasTariff: TariffVersion = {
        id: 'test-gas-tariff',
        tariff_name: 'Test Gas Tariff',
        tariff_type: 'RL.1',
        valid_from: '2023-01-01',
        valid_to: undefined,
        is_active: true,
        is_indexed: false,
        created_at: '',
        updated_at: '',
        company_id: 'test-company',
        batch_id: 'test-batch',
        supplier_name: 'Test Supplier',
        tariff_components: [
            {
                id: 'comp-fixed',
                tariff_version_id: 'test-gas-tariff',
                company_id: 'test-company',
                created_at: '',
                component_type: 'fixed_fee',
                fixed_price_eur_month: 5.0, // 5 EUR/month
                period: 'P1',
            },
            {
                id: 'comp-energy',
                tariff_version_id: 'test-gas-tariff',
                company_id: 'test-company',
                created_at: '',
                component_type: 'energy_price',
                price_eur_kwh: 0.10, // 0.10 EUR/kWh
                period: 'P1',
            }
        ]
    };

    const mockInput: CalculationInput = {
        tariff_version: mockGasTariff,
        annual_consumption_kwh: 4000, // 4000 kWh/year (RL.1 range)
        contracted_power_kw: 0, // Irrelevant for gas
        // tariff_type: 'RL.1', // Removed per type definition
    };

    it('calculates fixed term correctly', () => {
        const result = calculateGasAnnualCost(mockInput);
        // Fixed: 5 EUR/month * 12 = 60 EUR
        expect(result.breakdown.fixed_fee).toBeCloseTo(60, 2);
    });

    it('calculates variable term correctly', () => {
        const result = calculateGasAnnualCost(mockInput);
        // Variable: 4000 kWh * 0.10 EUR/kWh = 400 EUR
        expect(result.breakdown.energy_cost).toBeCloseTo(400, 2);
    });

    it('calculates hydrocarbon tax correctly', () => {
        const result = calculateGasAnnualCost(mockInput);
        // Tax: 4000 kWh * 0.00234 EUR/kWh = 9.36 EUR
        const expectedTax = 4000 * GAS_CONSTANTS.TAXES.HYDROCARBON;
        expect(result.breakdown.tax_breakdown?.electricity_tax).toBeCloseTo(expectedTax, 2);
    });

    it('calculates annual total correctly', () => {
        const result = calculateGasAnnualCost(mockInput);
        // Fixed (60) + Variable (400) + IHE (9.36) = 469.36 Base
        // IVA (21%) = 98.5656
        // Total = 567.9256
        expect(result.annual_cost_eur).toBeCloseTo(567.93, 2);
    });

    it('delegates to gas calculator in unified function', () => {
        // For unified function, tariff_type in tariff_version triggers gas calculator
        const result = calculateAnnualCost(mockInput);
        expect(result.annual_cost_eur).toBeCloseTo(567.93, 2);
    });
});
