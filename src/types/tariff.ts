// Re-export all tariff types from the canonical shared types module.
// This file exists only for backward compatibility — prefer importing from '@/shared/types'.
export type {
    TariffStructureCode,
    TariffStructure,
    Supplier,
    TariffCompletionStatus,
    TariffVersion,
    TariffRateType,
    TariffRate,
    TariffSchedule,
    TariffWizardState,
    PriceSet,
    DetectedTariff,
    SupplyType,
    TariffComponent,
    TariffBatch,
    TariffBatchStatus,
    ComponentType,
} from '@/shared/types';
