-- Migration: Create invoice_extractions table
-- Required by: extract-invoice-data edge function
-- Stores AI-extracted data from uploaded invoices (PDF/image → Gemini → structured JSON)

BEGIN;

-- ============================================================================
-- INVOICE EXTRACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,       -- Path in Supabase Storage (invoices bucket)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_data JSONB,             -- Structured data extracted by Gemini AI
    error_message TEXT,               -- Error details if extraction failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE invoice_extractions IS 'AI-extracted invoice data: PDF/image uploads processed by Gemini';
COMMENT ON COLUMN invoice_extractions.extracted_data IS 'Structured JSON with customer, CUPS, tariff, consumption, and pricing data';
COMMENT ON COLUMN invoice_extractions.storage_path IS 'File path in the invoices Supabase Storage bucket';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: all extractions for a company
CREATE INDEX idx_invoice_extractions_company_id ON invoice_extractions(company_id);

-- User history
CREATE INDEX idx_invoice_extractions_user_id ON invoice_extractions(user_id);

-- Status filtering (e.g., find pending/failed extractions)
CREATE INDEX idx_invoice_extractions_status ON invoice_extractions(company_id, status);

-- Chronological ordering
CREATE INDEX idx_invoice_extractions_created ON invoice_extractions(company_id, created_at DESC);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE TRIGGER set_invoice_extractions_updated_at
    BEFORE UPDATE ON invoice_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE invoice_extractions ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view extractions from their own company
CREATE POLICY "invoice_extractions_select_company_isolation"
    ON invoice_extractions FOR SELECT
    USING (company_id = public.get_auth_company_id());

-- INSERT: Users can create extractions for their own company
CREATE POLICY "invoice_extractions_insert_company_isolation"
    ON invoice_extractions FOR INSERT
    WITH CHECK (company_id = public.get_auth_company_id());

-- UPDATE: Users can update extractions from their own company
CREATE POLICY "invoice_extractions_update_company_isolation"
    ON invoice_extractions FOR UPDATE
    USING (company_id = public.get_auth_company_id())
    WITH CHECK (company_id = public.get_auth_company_id());

-- DELETE: Users can delete extractions from their own company
CREATE POLICY "invoice_extractions_delete_company_isolation"
    ON invoice_extractions FOR DELETE
    USING (company_id = public.get_auth_company_id());

COMMIT;
