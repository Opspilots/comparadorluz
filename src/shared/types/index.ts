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
    logo_url?: string;
    primary_color?: string;
    sidebar_color?: string;
    status: 'active' | 'suspended' | 'cancelled';
    subscription_tier?: string;
    // Billing
    plan_id?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    billing_interval?: BillingInterval;
    plan_expires_at?: string;
    trial_ends_at?: string;
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
    supply_type?: 'electricity' | 'gas';
    distributor?: string;
    point_type?: number;
    max_demand_kw?: number;
    has_bono_social?: boolean;
    bono_social_verified_at?: string;
    sips_imported_at?: string;
    sips_data?: Record<string, unknown>;
    contracted_power_p1_kw?: number;
    contracted_power_p2_kw?: number;
    contracted_power_p3_kw?: number;
    contracted_power_p4_kw?: number;
    contracted_power_p5_kw?: number;
    contracted_power_p6_kw?: number;
    last_meter_reading_date?: string;
    meter_type?: string;
    voltage_level?: string;
    connection_date?: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Agent Certifications (CNMC Jan 2025)
// ============================================================================

export type CertificationType =
    | 'cnmc_commercial_practices'
    | 'data_protection'
    | 'energy_market'
    | 'switching_procedures'
    | 'consumer_rights'
    | 'product_knowledge'
    | 'custom';

export interface AgentCertification {
    id: string;
    company_id: string;
    commissioner_id: string;
    certification_type: CertificationType;
    title: string;
    description?: string;
    issued_at: string;
    expires_at?: string;
    status: 'active' | 'expired' | 'revoked';
    issuer?: string;
    evidence_url?: string;
    score?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined
    commissioners?: Commissioner;
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
    created_at?: string;
}

export type TariffCompletionStatus = 'draft' | 'partial' | 'complete';

export interface TariffVersion {
    id: string;
    company_id: string;
    batch_id: string;
    file_id?: string;
    supplier_id?: string;
    supplier_name?: string; // Legacy — prefer supplier_id
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
    completion_status?: TariffCompletionStatus;
    commission_type?: 'percentage' | 'fixed';
    commission_value?: number;
    source_file_id?: string;
    name?: string; // Alias used by wizard flow
    code?: string; // Alias used by wizard flow
    tariff_structure_id?: string;
    created_at: string;
    updated_at: string;
    tariff_components?: TariffComponent[]; // For joined data
    tariff_rates?: TariffRate[]; // For joined data
    suppliers?: Supplier; // For joined data
}

export type TariffRateType = 'energy' | 'power' | 'fixed_fee' | 'discount' | 'tax' | 'reactive' | 'excess_power';

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
    confidence_score?: number;
    source_page?: number;
    source_bbox?: { x: number; y: number; w: number; h: number };
    contract_duration?: number | null;
    valid_from?: string; // Price validity start
    valid_to?: string;   // Price validity end
}

export interface TariffSchedule {
    id: string;
    tariff_version_id: string;
    month_mask: number[];
    day_type_mask: number[];
    context_calendar?: string;
    start_hour: string;
    end_hour: string;
    period: string;
}

export interface TariffWizardState {
    metadata: {
        supplier_id: string;
        tariff_structure_id: string;
        name: string;
        code: string;
        is_indexed: boolean;
        valid_from: string;
        contract_duration: number | null;
        commission_type: 'percentage' | 'fixed';
        commission_value: number;
    };
    rates: TariffRate[];
    schedules: TariffSchedule[];
    currentStep: number;
    validationErrors: Record<string, string>;
}

export interface PriceSet {
    valid_from?: string;
    valid_to?: string;
    contract_duration?: number | null;
    energy_prices: Array<{ period?: string; price: number }>;
    power_prices: Array<{ period?: string; price: number; unit?: string }>;
    fixed_term_prices: Array<{ period?: string; price: number; unit?: string }>;
}

export interface DetectedTariff {
    id: string;
    fileName: string;
    supplier_name?: string;
    tariff_name?: string;
    tariff_structure?: string;
    supply_type?: 'electricity' | 'gas';
    contract_duration?: number | null;
    is_indexed?: boolean;
    valid_from?: string;
    valid_to?: string | null;
    price_sets: PriceSet[];
    energy_prices: Array<{ period?: string; price: number }>;
    power_prices: Array<{ period?: string; price: number; unit?: string }>;
    fixed_term_prices: Array<{ period?: string; price: number; unit?: string }>;
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
    training_compliant?: boolean;
    training_checked_at?: string;
    created_at: string;
    updated_at: string;
}

export type SwitchingStatus =
    | 'requested'
    | 'in_progress'
    | 'completed'
    | 'rejected';

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
    integration_id?: string;
    status: ContractStatus;
    signed_at?: string;
    activation_date?: string;
    cancellation_date?: string;
    annual_value_eur: number;
    commission_eur?: number;
    notes?: string;
    switching_status?: SwitchingStatus | null;
    switching_requested_at?: string | null;
    switching_from_contract_id?: string | null;
    switching_notes?: string | null;
    switching_completed_at?: string | null;
    estimated_activation_date?: string | null;
    switching_deadline_at?: string | null;
    switching_deadline_warning_sent?: boolean;
    notification_sent?: boolean;
    // Origin tariff (client's current tariff when contract was created from comparison)
    origin_supplier_name?: string | null;
    origin_tariff_name?: string | null;
    origin_annual_cost_eur?: number | null;
    created_at: string;
    updated_at: string;
    // Joined data
    customers?: Customer;
    commissioners?: Commissioner;
    tariff_versions?: TariffVersion & { suppliers?: { name: string } };
    supply_points?: SupplyPoint;
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

export interface ContractTemplate {
    id: string;
    company_id: string;
    // Colors
    primary_color: string;
    accent_color: string;
    text_color: string;
    section_bg_color: string;
    notes_bg_color: string;
    notes_border_color: string;
    // Header
    contract_title: string;
    company_name: string;
    company_tagline?: string;
    company_logo_url?: string;
    // Footer
    footer_text: string;
    footer_show_date: boolean;
    footer_show_page_number: boolean;
    // Typography & layout
    font_size_base: number;
    page_padding: number;
    // Legal
    custom_legal_text?: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Integrations Domain
// ============================================================================

export type IntegrationMode = 'api' | 'data_platform'

export interface IntegrationProvider {
    id: string
    slug: string
    display_name: string
    logo_url: string | null
    auth_type: 'api_key' | 'oauth2' | 'basic_auth' | 'none'
    capabilities: Array<'quote' | 'contract_submit' | 'switching' | 'status_check' | 'consumption'>
    integration_mode: IntegrationMode
    docs_url: string | null
    portal_url: string | null
    description: string | null
    is_active: boolean
    created_at: string
}

export interface Integration {
    id: string
    company_id: string
    provider_id: string
    status: 'inactive' | 'connecting' | 'active' | 'error' | 'expired'
    credentials: Record<string, string> | null
    agent_config: {
        agent_code?: string
        commission_rate?: number
        default_tariff_ids?: string[]
    }
    last_sync_at: string | null
    last_error: string | null
    sync_enabled: boolean
    created_at: string
    updated_at: string
    integration_providers?: IntegrationProvider
}

export interface IntegrationEvent {
    id: string
    company_id: string
    integration_id: string
    event_type: string
    payload: Record<string, unknown>
    contract_id: string | null
    customer_id: string | null
    cups: string | null
    processed: boolean
    processed_at: string | null
    error: string | null
    received_at: string
}

// ============================================================================
// Consumption & Market Data
// ============================================================================

export interface ConsumptionData {
    id: string
    company_id: string
    cups: string
    date: string
    hour: number | null
    consumption_kwh: number
    source: string
    period: string | null
    method: string | null
    created_at: string
}

export interface MarketPrice {
    id: string
    price_date: string
    hour: number
    price_type: string
    price_eur_mwh: number
    geo_id: string
    source: string
    indicator_id: number | null
    created_at: string
}

// ============================================================================
// Regulatory Compliance (RGPD, LOPD-GDD, RD 88/2026)
// ============================================================================

export type ConsentType =
    | 'data_processing'
    | 'commercial_contact'
    | 'switching_authorization'
    | 'data_sharing'
    | 'marketing';

export type ConsentMethod = 'written' | 'digital' | 'verbal_recorded' | 'checkbox';

export interface CustomerConsent {
    id: string;
    company_id: string;
    customer_id: string;
    consent_type: ConsentType;
    granted: boolean;
    granted_at?: string;
    revoked_at?: string;
    granted_by?: string;
    method?: ConsentMethod;
    evidence_url?: string;
    ip_address?: string;
    notes?: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
}

export type DataSubjectRequestType =
    | 'access'
    | 'rectification'
    | 'erasure'
    | 'restriction'
    | 'portability'
    | 'objection';

export type DataSubjectRequestStatus =
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'rejected'
    | 'extended';

export interface DataSubjectRequest {
    id: string;
    company_id: string;
    customer_id?: string;
    request_type: DataSubjectRequestType;
    requester_name: string;
    requester_email?: string;
    requester_nif?: string;
    status: DataSubjectRequestStatus;
    description?: string;
    response_notes?: string;
    deadline_at: string;
    extended_deadline_at?: string;
    completed_at?: string;
    handled_by?: string;
    created_at: string;
    updated_at: string;
    // Joined
    customers?: Customer;
}

export type DataCategory =
    | 'customer_data'
    | 'consumption_data'
    | 'contract_data'
    | 'comparison_data'
    | 'message_data'
    | 'audit_logs';

export interface DataRetentionPolicy {
    id: string;
    company_id: string;
    data_category: DataCategory;
    retention_months: number;
    legal_basis?: string;
    auto_delete: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Consent Requests (digital signing flow)
export type ConsentRequestStatus = 'sent' | 'viewed' | 'signed' | 'expired' | 'rejected';

export interface ConsentRequest {
    id: string;
    company_id: string;
    customer_id: string;
    contact_id?: string;
    consent_types: ConsentType[];
    legal_text: string;
    channel: 'email' | 'whatsapp';
    recipient_contact: string;
    message_id?: string;
    token: string;
    status: ConsentRequestStatus;
    sent_at?: string;
    viewed_at?: string;
    signed_at?: string;
    expired_at?: string;
    expires_at: string;
    signer_name?: string;
    signer_nif?: string;
    signer_ip?: string;
    signature_data?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    // Joined
    customers?: Customer;
    contacts?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
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

// ============================================================================
// Billing & Subscription
// ============================================================================

export type PlanTier = 'free' | 'standard' | 'professional' | 'early_adopter'
export type BillingInterval = 'monthly' | 'yearly'

export interface PlanLimits {
    max_users: number              // -1 = unlimited
    max_supply_points: number      // -1 = unlimited
    ai_uses_per_month: number      // -1 = unlimited
    comparisons_per_month: number  // -1 = unlimited
    messages_per_month: number     // -1 = unlimited
    max_customers: number          // -1 = unlimited
}

export interface PlanFeatures {
    crm: boolean
    comparator: boolean
    messaging: boolean
    commissioners: boolean
    compliance: boolean
    pdf_reports: boolean
    api_access: boolean
    advanced_analytics: boolean
    tariff_upload: boolean
}

export interface Plan {
    id: string
    name: PlanTier
    display_name: string
    price_monthly: number
    price_yearly: number
    stripe_price_monthly_id?: string
    stripe_price_yearly_id?: string
    limits: PlanLimits
    features: PlanFeatures
    is_active: boolean
    sort_order: number
    created_at: string
}

export interface UsageTracking {
    id: string
    company_id: string
    feature_key: string
    period_start: string
    count: number
    created_at: string
    updated_at: string
}

export interface CompanyBilling {
    plan_id?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
    billing_interval: BillingInterval
    plan_expires_at?: string
    trial_ends_at?: string
}
