/**
 * Comprehensive Test Suite for Tariff Calculator
 *
 * Tests cover:
 * - Standard calculations for 2.0TD and 3.0TD tariffs
 * - Edge cases (zero consumption, high values, fractional power)
 * - Tax calculations
 * - Reproducibility (snapshot testing)
 * - Error handling
 *
 * CRITICAL: These tests validate the core business logic.
 * All tests must pass before deploying to production.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateAnnualCost,
    calculateEnergyComponent,
    calculatePowerComponent,
    calculateFixedFee,
    applyTaxes,
    calculateSavings,

} from './calculator';
import type { TariffVersion, TariffRate } from '@/shared/types';

// ============================================================================
// Test Fixtures — Using tariff_rates (new schema)
// ============================================================================

/**
 * Mock 2.0TD tariff (residential simplified)
 * - 3 energy periods (P1, P2, P3) — 2.0TD has 3 energy + 2 power
 * - Energy: P1=0.15, P2=0.12, P3=0.08 EUR/kWh
 * - Power: P1=40, P2=20 EUR/kW/year
 * - Fixed fee: 5 EUR/month
 */
const mockTariff2_0TD: TariffVersion = {
    id: 'tariff-2-0-td',
    company_id: 'company-1',
    batch_id: 'batch-1',
    supplier_name: 'Endesa',
    tariff_name: 'Tarifa One Luz',
    tariff_type: '2.0TD',
    valid_from: '2026-02-15',
    is_active: true,
    created_at: '2026-02-03T12:00:00Z',
    updated_at: '2026-02-03T12:00:00Z',
    tariff_rates: [
        // Energy prices
        {
            id: 'rate-e1',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'energy',
            period: 'P1',
            price: 0.15,
            unit: 'EUR/kWh',
        },
        {
            id: 'rate-e2',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'energy',
            period: 'P2',
            price: 0.12,
            unit: 'EUR/kWh',
        },
        {
            id: 'rate-e3',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'energy',
            period: 'P3',
            price: 0.08,
            unit: 'EUR/kWh',
        },
        // Power prices
        {
            id: 'rate-p1',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'power',
            period: 'P1',
            price: 40,
            unit: 'EUR/kW/year',
        },
        {
            id: 'rate-p2',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'power',
            period: 'P2',
            price: 20,
            unit: 'EUR/kW/year',
        },
        // Fixed fee
        {
            id: 'rate-f1',
            tariff_version_id: 'tariff-2-0-td',
            item_type: 'fixed_fee',
            price: 5,
            unit: 'EUR/month',
        },
    ],
};

/**
 * Mock 3.0TD tariff (business)
 * - 3 periods (P1, P2, P3)
 * - Energy: P1=0.18, P2=0.14, P3=0.10 EUR/kWh
 * - Power: P1=50, P2=30, P3=15 EUR/kW/year
 * - No fixed fee
 */
const mockTariff3_0TD: TariffVersion = {
    id: 'tariff-3-0-td',
    company_id: 'company-1',
    batch_id: 'batch-1',
    supplier_name: 'Iberdrola',
    tariff_name: 'Tarifa Empresa',
    tariff_type: '3.0TD',
    valid_from: '2026-02-15',
    is_active: true,
    created_at: '2026-02-03T12:00:00Z',
    updated_at: '2026-02-03T12:00:00Z',
    tariff_rates: [
        // Energy prices
        {
            id: 'rate-e1',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'energy',
            period: 'P1',
            price: 0.18,
            unit: 'EUR/kWh',
        },
        {
            id: 'rate-e2',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'energy',
            period: 'P2',
            price: 0.14,
            unit: 'EUR/kWh',
        },
        {
            id: 'rate-e3',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'energy',
            period: 'P3',
            price: 0.10,
            unit: 'EUR/kWh',
        },
        // Power prices
        {
            id: 'rate-p1',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'power',
            period: 'P1',
            price: 50,
            unit: 'EUR/kW/year',
        },
        {
            id: 'rate-p2',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'power',
            period: 'P2',
            price: 30,
            unit: 'EUR/kW/year',
        },
        {
            id: 'rate-p3',
            tariff_version_id: 'tariff-3-0-td',
            item_type: 'power',
            period: 'P3',
            price: 15,
            unit: 'EUR/kW/year',
        },
    ],
};

// ============================================================================
// Component Function Tests
// ============================================================================

describe('calculateEnergyComponent', () => {
    it('should calculate energy cost for 2 periods', () => {
        const energyPrices = new Map([
            ['P1', 0.15],
            ['P2', 0.12],
        ]);
        const totalConsumption = 5000; // kWh/year
        const distribution = { P1: 60, P2: 40 };

        const result = calculateEnergyComponent(energyPrices, totalConsumption, distribution);

        // P1: 5000 * 0.6 * 0.15 = 450
        // P2: 5000 * 0.4 * 0.12 = 240
        // Total: 690
        expect(result.total).toBe(690);
        expect(result.breakdown.P1.kwh).toBe(3000);
        expect(result.breakdown.P1.cost).toBe(450);
        expect(result.breakdown.P2.kwh).toBe(2000);
        expect(result.breakdown.P2.cost).toBe(240);
    });

    it('should calculate energy cost for 3 periods', () => {
        const energyPrices = new Map([
            ['P1', 0.18],
            ['P2', 0.14],
            ['P3', 0.10],
        ]);
        const totalConsumption = 50000;
        const distribution = { P1: 40, P2: 35, P3: 25 };

        const result = calculateEnergyComponent(energyPrices, totalConsumption, distribution);

        // P1: 50000 * 0.4 * 0.18 = 3600
        // P2: 50000 * 0.35 * 0.14 = 2450
        // P3: 50000 * 0.25 * 0.10 = 1250
        // Total: 7300
        expect(result.total).toBe(7300);
    });

    it('should handle zero consumption', () => {
        const energyPrices = new Map([
            ['P1', 0.15],
            ['P2', 0.12],
        ]);
        const result = calculateEnergyComponent(energyPrices, 0, { P1: 60, P2: 40 });

        expect(result.total).toBe(0);
    });

    it('should skip period if price is missing', () => {
        const energyPrices = new Map([['P1', 0.15]]);
        const distribution = { P1: 60, P2: 40 };

        const result = calculateEnergyComponent(energyPrices, 5000, distribution);

        // P1: 5000 * 0.6 * 0.15 = 450
        // P2: skipped
        // Total: 450
        expect(result.total).toBe(450);
        expect(result.breakdown.P1).toBeDefined();
        expect(result.breakdown.P2).toBeUndefined();
    });
});

describe('calculatePowerComponent', () => {
    it('should calculate power cost for multiple periods', () => {
        const powerPrices = new Map([
            ['P1', 40],
            ['P2', 20],
        ]);
        const contractedPowers = { P1: 10, P2: 10 };

        const result = calculatePowerComponent(powerPrices, contractedPowers);

        // P1: 10 * 40 = 400
        // P2: 10 * 20 = 200
        // Total: 600
        expect(result).toBe(600);
    });

    it('should handle fractional power values', () => {
        const powerPrices = new Map([['P1', 40]]);
        const result = calculatePowerComponent(powerPrices, { P1: 10.37 });

        // 10.37 * 40 = 414.8
        expect(result).toBe(414.8);
    });

    it('should handle zero power', () => {
        const powerPrices = new Map([['P1', 40]]);
        const result = calculatePowerComponent(powerPrices, { P1: 0 });

        expect(result).toBe(0);
    });
});

describe('calculateFixedFee', () => {
    it('should calculate annual fixed fee from monthly', () => {
        const rates: TariffRate[] = [
            {
                id: 'rate-f1',
                tariff_version_id: 'tariff-1',
                item_type: 'fixed_fee',
                price: 5,
                unit: 'EUR/month',
            },
        ];

        const result = calculateFixedFee(rates, 12);

        // 5 * 12 = 60
        expect(result).toBe(60);
    });

    it('should return 0 if no fixed fee rate', () => {
        const rates: TariffRate[] = [];
        const result = calculateFixedFee(rates, 12);

        expect(result).toBe(0);
    });
});

describe('applyTaxes', () => {
    it('should apply Spanish electricity taxes correctly', () => {
        const subtotal = 1000;

        const result = applyTaxes(subtotal);

        // Electricity Tax: 1000 * 0.0511 = 51.1
        // Base for IVA: 1000 + 51.1 = 1051.1
        // IVA: 1051.1 * 0.21 = 220.73
        // Total taxes: 51.1 + 220.73 = 271.83
        expect(result.breakdown.electricity_tax).toBe(51.1);
        expect(result.breakdown.iva).toBe(220.73);
        expect(result.total).toBe(271.83);
    });

    it('should handle zero subtotal', () => {
        const result = applyTaxes(0);

        expect(result.total).toBe(0);
        expect(result.breakdown.electricity_tax).toBe(0);
        expect(result.breakdown.iva).toBe(0);
    });
});

describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
        const newCost = 1200;
        const currentCost = 1500;

        const result = calculateSavings(newCost, currentCost);

        expect(result.annual_savings_eur).toBe(300);
        expect(result.savings_pct).toBe(20);
    });

    it('should handle negative savings (cost increase)', () => {
        const newCost = 1500;
        const currentCost = 1200;

        const result = calculateSavings(newCost, currentCost);

        expect(result.annual_savings_eur).toBe(-300);
        expect(result.savings_pct).toBe(-25);
    });

    it('should return empty object if no current cost', () => {
        const result = calculateSavings(1200);

        expect(result.annual_savings_eur).toBeUndefined();
        expect(result.savings_pct).toBeUndefined();
    });
});

// ============================================================================
// End-to-End Calculation Tests
// ============================================================================

describe('calculateAnnualCost - 2.0TD Tariff', () => {
    it('should calculate correctly for standard residential case', () => {
        const result = calculateAnnualCost({
            tariff_version: mockTariff2_0TD,
            annual_consumption_kwh: 5000,
            contracted_power_kw: 10,
            consumption_distribution: { P1: 60, P2: 40 }, // Explicit 2-period distribution
            meter_rental_eur_month: 0, // Disable meter rental for this test
        });

        // Energy: (5000*0.6*0.15) + (5000*0.4*0.12) = 450 + 240 = 690
        // Power: (10*40) + (10*20) = 400 + 200 = 600
        // Fixed: 5*12 = 60
        // Subtotal: 690 + 600 + 60 = 1350
        // Electricity Tax: 1350 * 0.0511 = 68.99
        // Base for IVA: 1350 + 68.99 = 1418.99
        // IVA: 1418.99 * 0.21 = 297.99
        // Total: 1350 + 68.99 + 297.99 = 1716.98
        expect(result.annual_cost_eur).toBe(1716.98);
        expect(result.monthly_cost_eur).toBe(143.08);
        expect(result.breakdown.energy_cost).toBe(690);
        expect(result.breakdown.power_cost).toBe(600);
        expect(result.breakdown.fixed_fee).toBe(60);
        expect(result.breakdown.subtotal).toBe(1350);
        expect(result.breakdown.taxes).toBe(366.98);
        expect(result.breakdown.total).toBe(1716.98);
    });

    it('should use default distribution if not provided', () => {
        // 2.0TD default distribution: P1=29%, P2=26%, P3=45%
        // mockTariff2_0TD has P1, P2, P3 energy rates
        const result = calculateAnnualCost({
            tariff_version: mockTariff2_0TD,
            annual_consumption_kwh: 5000,
            contracted_power_kw: 10,
            meter_rental_eur_month: 0,
        });

        // P1: 5000*0.29*0.15 = 217.50
        // P2: 5000*0.26*0.12 = 156.00
        // P3: 5000*0.45*0.08 = 180.00
        // Energy total: 553.50
        expect(result.breakdown.energy_cost).toBe(553.5);
        expect(result.breakdown.period_breakdown?.P1?.kwh).toBe(1450);
        expect(result.breakdown.period_breakdown?.P2?.kwh).toBe(1300);
        expect(result.breakdown.period_breakdown?.P3?.kwh).toBe(2250);
    });

    it('should use custom distribution if provided', () => {
        const result = calculateAnnualCost({
            tariff_version: mockTariff2_0TD,
            annual_consumption_kwh: 5000,
            contracted_power_kw: 10,
            consumption_distribution: { P1: 50, P2: 50 },
            meter_rental_eur_month: 0
        });

        expect(result.breakdown.period_breakdown?.P1?.kwh).toBe(2500);
        expect(result.breakdown.period_breakdown?.P2?.kwh).toBe(2500);
    });

    it('should handle zero consumption (minimum fees only)', () => {
        const result = calculateAnnualCost({
            tariff_version: mockTariff2_0TD,
            annual_consumption_kwh: 0,
            contracted_power_kw: 10,
            meter_rental_eur_month: 0
        });

        // Energy: 0
        // Power: 600
        // Fixed: 60
        // Subtotal: 660
        expect(result.breakdown.energy_cost).toBe(0);
        expect(result.breakdown.power_cost).toBe(600);
        expect(result.annual_cost_eur).toBeGreaterThan(800);
    });
});

describe('calculateAnnualCost - 3.0TD Tariff', () => {
    it('should calculate correctly for business case', () => {
        const result = calculateAnnualCost({
            tariff_version: mockTariff3_0TD,
            annual_consumption_kwh: 50000,
            contracted_power_kw: 50,
            meter_rental_eur_month: 0.81 // Default
        });

        // Energy (40/35/25 distribution): 7300
        // Power: 4750
        // Fixed: 0
        // Meter Rental: 0.81 * 12 = 9.72
        // Subtotal: 7300 + 4750 + 9.72 = 12059.72

        expect(result.breakdown.energy_cost).toBe(7300);
        expect(result.breakdown.power_cost).toBe(4750);
        expect(result.breakdown.fixed_fee).toBe(0);
        expect(result.breakdown.subtotal).toBe(12059.72);

        // Verify total is reasonable (should be ~15k with taxes)
        expect(result.annual_cost_eur).toBeGreaterThan(14000);
        expect(result.annual_cost_eur).toBeLessThan(16000);
    });
});

// ============================================================================
// Reproducibility Tests
// ============================================================================

describe('Reproducibility', () => {
    it('should return identical results for identical inputs', () => {
        const input = {
            tariff_version: mockTariff2_0TD,
            annual_consumption_kwh: 5000,
            contracted_power_kw: 10,
        };

        const result1 = calculateAnnualCost(input);
        const result2 = calculateAnnualCost(input);

        // Bit-for-bit identical (critical requirement)
        expect(result1).toEqual(result2);
    });

    it('should maintain precision with very large numbers', () => {
        const result = calculateAnnualCost({
            tariff_version: mockTariff3_0TD,
            annual_consumption_kwh: 1000000, // 1M kWh
            contracted_power_kw: 500,
        });

        // Should handle without overflow
        expect(result.annual_cost_eur).toBeGreaterThan(0);
        expect(Number.isFinite(result.annual_cost_eur)).toBe(true);
    });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
    it('should throw if tariff has no rates', () => {
        const invalidTariff: TariffVersion = {
            ...mockTariff2_0TD,
            tariff_rates: [],
        };

        expect(() => {
            calculateAnnualCost({
                tariff_version: invalidTariff,
                annual_consumption_kwh: 5000,
                contracted_power_kw: 10,
            });
        }).toThrow('Tariff version has no rates');
    });

    it('should throw if energy prices are missing', () => {
        const tariffNoPrices: TariffVersion = {
            ...mockTariff2_0TD,
            tariff_rates: [
                {
                    id: 'rate-f1',
                    tariff_version_id: 'tariff-1',
                    item_type: 'fixed_fee',
                    price: 5,
                    unit: 'EUR/month',
                },
            ],
        };

        expect(() => {
            calculateAnnualCost({
                tariff_version: tariffNoPrices,
                annual_consumption_kwh: 5000,
                contracted_power_kw: 10,
            });
        }).toThrow('No energy prices found in tariff');
    });
});
