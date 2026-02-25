/**
 * Shared TypeScript types for the EnergyDeal CRM application
 */

// ============================================================================
// Multi-Tenancy & Auth
// ============================================================================

export interface Company {
    id: string;
    cif: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    status: 'active' | 'suspended' | 'cancelled';
    subscription_tier?: string;
    created_at: string;
    updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'commercial' | 'viewer';

export interface User {
    id: string;
    company_id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: 'active' | 'inactive';
    commission_default_pct?: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// CRM Domain
// ============================================================================

export type CustomerStatus =
    | 'prospecto'
    | 'contactado'
    | 'propuesta'
    | 'negociacion'
    | 'cliente'
    | 'perdido';

export interface Customer {
    id: string;
    company_id: string;
    cif: string;
    name: string;
    industry?: string;
    employee_count?: number;
    annual_revenue?: number;
    website?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    province?: string;
    customer_type: 'empresa' | 'particular';
    status: CustomerStatus;
    assigned_to?: string;
    created_at: string;
    updated_at: string;
}

export interface Contact {
    id: string;
    company_id: string;
    customer_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    position?: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface SupplyPoint {
    id: string;
    company_id: string;
    customer_id: string;
    cups?: string;
    address: string;
    postal_code?: string;
    city?: string;
    province?: string;
    annual_consumption_kwh?: number;
    contracted_power_kw?: number;
    current_supplier?: string;
    current_tariff_name?: string;
    tariff_type?: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Tariff Engine Domain
// ============================================================================

export type TariffBatchStatus =
    | 'uploaded'
    | 'processing'
    | 'validation_failed'
    | 'pending_review'
    | 'published';

export interface TariffBatch {
    id: string;
    company_id: string;
    uploaded_by: string;
    status: TariffBatchStatus;
    file_count: number;
    validation_errors?: Record<string, unknown>;
    reviewed_by?: string;
    reviewed_at?: string;
    published_by?: string;
    published_at?: string;
    created_at: string;
    updated_at: string;
}

export type ComponentType =
    | 'energy_price'
    | 'power_price'
    | 'fixed_fee'
    | 'tax'
    | 'discount';

export interface TariffComponent {
    id: string;
    company_id: string;
    tariff_version_id: string;
    component_type: ComponentType;
    period?: string;  // P1, P2, P3
    price_eur_kwh?: number;
    price_eur_kw_year?: number;
    fixed_price_eur_month?: number;
    tax_pct?: number;
    contract_duration?: number | null; // Duration in months
    valid_from?: string; // Price validity start
    valid_to?: string;   // Price validity end
    created_at: string;
}

export interface TariffVersion {
    id: string;
    company_id: string;
    batch_id: string;
    file_id?: string;
    supplier_name: string; // Matches schema
    tariff_name: string;
    tariff_code?: string;
    tariff_type: string;
    valid_from: string;  // Date string
    valid_to?: string;   // Date string
    is_active: boolean;
    is_indexed?: boolean;
    is_automated?: boolean;
    automation_source?: string;
    last_synced_at?: string;
    contract_duration?: number | null;
    created_at: string;
    updated_at: string;
    tariff_components?: TariffComponent[]; // For joined data
    tariff_rates?: TariffRate[]; // For joined data
}

export interface TariffRate {
    id: string;
    tariff_version_id: string;
    item_type: string;
    period?: string;
    price: number | null;
    unit: string;
    price_formula?: string;
    index_type?: string;
    margin?: number;
    contract_duration?: number | null;
    valid_from?: string; // Price validity start
    valid_to?: string;   // Price validity end
}

// ============================================================================
// Comparator Domain
// ============================================================================

export type ComparisonMode = 'client_first' | 'commercial_first';

export interface ComparisonInput {
    cif: string;
    customer_type: 'empresa';
    postal_code?: string;
    annual_consumption_kwh: number;
    contracted_power_kw: number;
    current_tariff?: string;
    tariff_type: string;
    consumption_distribution?: {
        P1?: number;  // Percentage 0-100
        P2?: number;
        P3?: number;
        P4?: number;
        P5?: number;
        P6?: number;
    };
    meter_rental_eur_month?: number;
    reactive_energy_kvarh?: number;
    max_demand_kw?: number;
    contracted_power_p1_kw?: number; // Granular power support
    contracted_power_p2_kw?: number;
    contracted_power_p3_kw?: number;
    contracted_power_p4_kw?: number;
    contracted_power_p5_kw?: number;
    contracted_power_p6_kw?: number;
}

export interface Comparison {
    id: string;
    company_id: string;
    customer_id?: string;
    supply_point_id?: string;
    performed_by: string;
    mode: ComparisonMode;
    inputs_snapshot: ComparisonInput;
    results_count: number;
    created_at: string;
}

export interface ComparisonResult {
    id: string;
    company_id: string;
    comparison_id: string;
    tariff_version_id: string;
    rank: number;
    annual_cost_eur: number;
    monthly_cost_eur: number;
    annual_savings_eur?: number;
    savings_pct?: number;
    commission_eur?: number;
    calculation_breakdown: CalculationBreakdown;
    created_at: string;
    // Joined data
    tariff_version?: TariffVersion;
}

export interface GroupedComparisonResult {
    tariff_version_id: string;
    supplier_name: string;
    tariff_name: string;
    tariff_version: TariffVersion;
    duration_options: Array<{
        duration: number | null;
        label: string;
        result: ComparisonResult;
    }>;
    best_rank: number;
}

// ============================================================================
// Calculation Types
// ============================================================================

export interface CalculationBreakdown {
    energy_cost: number;
    power_cost: number;
    fixed_fee: number;
    subtotal: number;
    taxes: number;
    total: number;
    tax_breakdown?: {
        iva: number;
        electricity_tax?: number;
        hydrocarbon_tax?: number;
    };
    period_breakdown?: {
        P1?: { kwh: number; cost: number };
        P2?: { kwh: number; cost: number };
        P3?: { kwh: number; cost: number };
        P4?: { kwh: number; cost: number };
        P5?: { kwh: number; cost: number };
        P6?: { kwh: number; cost: number };
    };
    penalties?: {
        reactive: number;
        excess_power: number;
    };

}

export interface CalculationInput {
    tariff_version: TariffVersion;
    annual_consumption_kwh: number;
    contracted_power_kw: number;
    consumption_distribution?: {
        P1?: number;
        P2?: number;
        P3?: number;
        P4?: number;
        P5?: number;
        P6?: number;
    };
    // Advanced fields for 3.0TD/6.XTD
    reactive_energy_kvarh?: number;
    max_demand_kw?: number;
    meter_rental_eur_month?: number;
    contracted_power_p1_kw?: number;
    contracted_power_p2_kw?: number;
    contracted_power_p3_kw?: number;
    contracted_power_p4_kw?: number;
    contracted_power_p5_kw?: number;
    contracted_power_p6_kw?: number;
    current_cost_eur?: number;
    market_prices?: Array<{ indicator_id: number; price: number }>;
}

export interface CalculationResult {
    annual_cost_eur: number;
    monthly_cost_eur: number;
    breakdown: CalculationBreakdown;
    annual_savings_eur?: number;
    savings_pct?: number;
}

// ============================================================================
// Contracts & Commissions
// ============================================================================

export type ContractStatus =
    | 'pending'
    | 'signed'
    | 'active'
    | 'cancelled'
    | 'completed';


export interface Commissioner {
    id: string;
    company_id: string;
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    nif?: string;
    address?: string;
    commission_default_pct?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Contract {
    id: string;
    company_id: string;
    customer_id: string;
    supply_point_id?: string;
    comparison_id?: string;
    comparison_result_id?: string;
    commercial_id: string; // references commissioners(id)
    tariff_version_id: string;
    contract_number?: string;
    status: ContractStatus;
    signed_at?: string;
    activation_date?: string;
    cancellation_date?: string;
    annual_value_eur: number;
    commission_eur?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    customers?: Customer;
    commissioners?: Commissioner;
    tariff_versions?: TariffVersion & { suppliers?: { name: string } };
}

export interface CommissionRule {
    id: string;
    company_id: string;
    commissioner_id: string; // Renamed from user_id
    supplier_name?: string;
    tariff_type?: string;
    commission_pct: number;
    valid_from: string;
    valid_to?: string;
    is_active: boolean;
    created_at: string;
    commissioners?: { full_name: string };
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

export interface Campaign {
    id: string;
    company_id: string;
    created_by?: string;
    name: string;
    channel: 'email' | 'whatsapp';
    subject?: string;
    body?: string;
    status: CampaignStatus;
    scheduled_at?: string;
    filters?: Record<string, unknown>; // jsonb
    template_id?: string;
    created_at: string;
    updated_at: string;
}
