export type TariffStructureCode = '2.0TD' | '3.0TD' | '6.1TD' | '6.0' | '3.0A' | '6.1A' | 'RL.1' | 'RL.2' | 'RL.3' | 'RL.4';
export type SupplyType = 'electricity' | 'gas';

export interface TariffStructure {
    id: string;
    code: TariffStructureCode;
    name: string;
    energy_periods: number;
    power_periods: number;
    default_schedule_template_id?: string;
}

export interface Supplier {
    id: string;
    name: string;
    is_active: boolean;
    logo_url?: string;
    created_at?: string;
}

export type TariffCompletionStatus = 'draft' | 'partial' | 'complete';

export interface TariffVersion {
    id: string;
    supplier_id: string;
    tariff_structure_id: string;
    name: string;
    code?: string;
    is_indexed: boolean;
    valid_from: string;
    valid_to?: string;
    contract_duration?: number | null; // 12, 24, 36 months
    completion_status: TariffCompletionStatus;
    is_active: boolean;
    source_file_id?: string;
    created_at: string;
    updated_at: string;
}

export type TariffRateType = 'energy' | 'power' | 'fixed_fee' | 'discount' | 'tax' | 'reactive' | 'excess_power';

export interface TariffRate {
    id: string;
    tariff_version_id: string;
    item_type: TariffRateType;
    period?: string; // 'P1', 'P2', etc.
    price: number | null;
    price_formula?: string; // For indexed rates
    unit: string;
    confidence_score?: number;
    source_page?: number;
    source_bbox?: { x: number, y: number, w: number, h: number };
    contract_duration?: number | null; // Duration in months (12, 24...)
    valid_from?: string; // Price validity start
    valid_to?: string;   // Price validity end
}

export interface TariffSchedule {
    id: string;
    tariff_version_id: string;
    month_mask: number[];
    day_type_mask: number[];
    context_calendar?: string;
    start_hour: string; // HH:MM:SS
    end_hour: string; // HH:MM:SS
    period: string; // 'P1'
}

// Form State Interface for the Wizard
export interface TariffWizardState {
    metadata: {
        supplier_id: string;
        tariff_structure_id: string;
        name: string;
        code: string;
        is_indexed: boolean;
        valid_from: string;
        contract_duration: number | null;
    };
    rates: TariffRate[];
    schedules: TariffSchedule[];
    // UI specific
    currentStep: number;
    validationErrors: Record<string, string>;
}
// ... existing types
export interface PriceSet {
    valid_from?: string;
    valid_to?: string;
    contract_duration?: number | null;
    energy_prices: Array<{ period?: string; price: number }>;
    power_prices: Array<{ period?: string; price: number; unit?: string }>;
    fixed_term_prices: Array<{ period?: string; price: number; unit?: string }>;
}

export interface DetectedTariff {
    id: string; // Temporary ID for UI
    fileName: string;
    supplier_name?: string;
    tariff_name?: string;
    tariff_structure?: string;
    supply_type?: 'electricity' | 'gas';
    contract_duration?: number | null; // Keep at top level as fallback
    is_indexed?: boolean;
    valid_from?: string; // OCR root level
    valid_to?: string | null; // OCR root level
    price_sets: PriceSet[];
    // Legacy flat arrays (kept for backwards compat with old prompt responses)
    energy_prices: Array<{ period?: string, price: number }>;
    power_prices: Array<{ period?: string, price: number, unit?: string }>;
    fixed_term_prices: Array<{ period?: string, price: number, unit?: string }>;
}

