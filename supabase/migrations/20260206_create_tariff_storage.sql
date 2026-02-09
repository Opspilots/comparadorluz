-- Migration: Create tariff-pdfs storage bucket
-- Created: 2026-02-06

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tariff-pdfs', 'tariff-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Company users can upload to their own folder
CREATE POLICY "Users can upload tariff PDFs to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tariff-pdfs' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);

-- Policy: Company users can read their own folder
CREATE POLICY "Users can read tariff PDFs from their company folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tariff-pdfs' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);

COMMIT;
