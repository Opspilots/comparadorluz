-- Migration: Support NIF and CIF for customers
-- Allows both Spanish CIF (B2B) and NIF (B2C) formats.
-- Adds customer_type to distinguish between them.

BEGIN;

-- Drop existing CIF check constraint
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_cif_check;

-- Rename cif to tax_id to be more generic, but keeping cif as column name for backward compat if preferred
-- For now, let's keep the name 'cif' but update the check
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'empresa' CHECK (customer_type IN ('empresa', 'particular')),
  ALTER COLUMN cif TYPE VARCHAR(12); -- Flexibility for future formats

-- New check constraint for NIF/CIF
-- CIF: Letter + 8 digits
-- NIF: 8 digits + Letter
ALTER TABLE public.customers ADD CONSTRAINT customers_tax_id_check 
  CHECK (cif ~ '^[A-Z][0-9]{8}$' OR cif ~ '^[0-9]{8}[A-Z]$');

-- Add comment
COMMENT ON COLUMN public.customers.cif IS 'Tax ID: Can be CIF (A12345678) for companies or NIF (12345678A) for individuals';

COMMIT;
