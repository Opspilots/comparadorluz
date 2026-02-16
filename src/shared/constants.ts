export const GAS_CONSTANTS = {
    TAXES: {
        HYDROCARBON: 0.00234, // €/kWh
        IVA_STANDARD: 0.21,
        IVA_REDUCED: 0.05, // Can be used if needed
    },
    THRESHOLDS: {
        RL1: 5000,
        RL2: 15000,
        RL3: 50000,
    },
    CONVERSION: {
        KWH_PER_M3: 11.70, // Average conversion factor
    }
} as const;
