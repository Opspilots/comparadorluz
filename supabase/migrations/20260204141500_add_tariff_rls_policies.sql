-- Migration: Add missing RLS policies for tariffs
-- Purpose: Allow admins/managers to UPDATE and DELETE tariffs
-- Author: CRM System
-- Date: 2026-02-04

-- 1. Policies for tariff_versions
CREATE POLICY "Admins and managers can update tariffs" ON tariff_versions
  FOR UPDATE
  USING (company_id = get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can delete tariffs" ON tariff_versions
  FOR DELETE
  USING (company_id = get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  ));

-- 2. Policies for tariff_components
-- Usually these are managed via parent, but if direct access needed:
CREATE POLICY "Admins and managers can insert components" ON tariff_components
  FOR INSERT
  WITH CHECK (company_id = get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can update components" ON tariff_components
  FOR UPDATE
  USING (company_id = get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admins and managers can delete components" ON tariff_components
  FOR DELETE
  USING (company_id = get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  ));

-- Ensure SELECT is open for components too
CREATE POLICY "All users can read active components" ON tariff_components
  FOR SELECT
  USING (company_id = get_auth_company_id());
