-- Migration: Relax Tax ID constraint to support NIE and complex CIFs
-- Previous constraint was too strict (only Letter+8Digits or 8Digits+Letter)
-- New constraint supports:
-- 1. Standard DNI: 8 digits + Letter
-- 2. NIE: X/Y/Z + 7 digits + Letter
-- 3. CIF: Letter + 7 digits + (Letter or Digit)

BEGIN;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tax_id_check;

ALTER TABLE public.customers ADD CONSTRAINT customers_tax_id_check 
  CHECK (
    -- DNI: 8 numbers + 1 letter (e.g. 12345678A)
    cif ~ '^[0-9]{8}[A-Z]$' 
    OR 
    -- NIE: X/Y/Z + 7 numbers + 1 letter (e.g. X1234567A)
    cif ~ '^[XYZ][0-9]{7}[A-Z]$'
    OR
    -- CIF: 1 letter + 7 numbers + 1 alphanumeric (digit or letter)
    -- Covers standard B12345678 and special cases like A1234567A
    cif ~ '^[A-Z][0-9]{7}[0-9A-Z]$'
  );

COMMIT;
