-- Migration: Add Tariff Structure 6.2
-- Purpose: Add peaje 6.2 (Alta Tensión 30kV - 72.5kV) to tariff_structures
-- Date: 2026-03-03

BEGIN;

INSERT INTO tariff_structures (code, name, energy_periods, power_periods)
VALUES ('6.2', 'Tarifa 6.2 (Alta Tensión 30kV-72.5kV)', 6, 6)
ON CONFLICT (code) DO NOTHING;

COMMIT;