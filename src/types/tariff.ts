export type TariffStructureCode = '2.0TD' | '3.0TD' | '6.1TD';

export interface TariffStructure {
    id: string;
    code: TariffStructureCode;
    name: string;
    energy_periods: number;
    power_periods: number;
    default_schedule_template_id?: string;
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
    completion_status: TariffCompletionStatus;
    is_active: boolean;
    source_file_id?: string;
    created_at: string;
    updated_at: string;
}

export type TariffRateType = 'energy' | 'power' | 'fixed_fee' | 'discount' | 'tax';

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
    };
    rates: TariffRate[];
    schedules: TariffSchedule[];
    // UI specific
    currentStep: number;
    validationErrors: Record<string, string>;
}
