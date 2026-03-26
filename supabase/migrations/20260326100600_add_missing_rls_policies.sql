-- Migration: Add missing RLS policies for tables with incomplete coverage
-- Tables: tariff_versions, tariff_components, campaign_recipients, notifications
-- Uses public.get_auth_user_role() and public.get_auth_company_id() (SECURITY DEFINER helpers)

BEGIN;

-- ============================================================================
-- #1: tariff_versions — Replace old UPDATE/DELETE policies that query users
--     table directly (RLS recursion risk) with get_auth_user_role() pattern.
-- ============================================================================
DROP POLICY IF EXISTS "Admins and managers can update tariffs" ON public.tariff_versions;
CREATE POLICY "tariff_versions_update_policy" ON public.tariff_versions
    FOR UPDATE
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    )
    WITH CHECK (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

DROP POLICY IF EXISTS "Admins and managers can delete tariffs" ON public.tariff_versions;
CREATE POLICY "tariff_versions_delete_policy" ON public.tariff_versions
    FOR DELETE
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

-- ============================================================================
-- #2: tariff_components — Replace old UPDATE/DELETE/INSERT policies that query
--     users table directly with get_auth_user_role() pattern.
-- ============================================================================
DROP POLICY IF EXISTS "Admins and managers can insert components" ON public.tariff_components;
CREATE POLICY "tariff_components_insert_policy" ON public.tariff_components
    FOR INSERT
    WITH CHECK (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

DROP POLICY IF EXISTS "Admins and managers can update components" ON public.tariff_components;
CREATE POLICY "tariff_components_update_policy" ON public.tariff_components
    FOR UPDATE
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    )
    WITH CHECK (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

DROP POLICY IF EXISTS "Admins and managers can delete components" ON public.tariff_components;
CREATE POLICY "tariff_components_delete_policy" ON public.tariff_components
    FOR DELETE
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

-- ============================================================================
-- #3: campaign_recipients — Missing UPDATE and DELETE policies.
--     Access is scoped via campaign → company_id chain.
-- ============================================================================
CREATE POLICY "campaign_recipients_update_policy" ON public.campaign_recipients
    FOR UPDATE
    USING (
        campaign_id IN (
            SELECT id FROM public.campaigns
            WHERE company_id = public.get_auth_company_id()
        )
    );

CREATE POLICY "campaign_recipients_delete_policy" ON public.campaign_recipients
    FOR DELETE
    USING (
        campaign_id IN (
            SELECT id FROM public.campaigns
            WHERE company_id = public.get_auth_company_id()
        )
    );

-- ============================================================================
-- #4: notifications — Missing INSERT and DELETE policies.
--     Scoped by user_id = auth.uid() (same pattern as existing SELECT/UPDATE).
-- ============================================================================
CREATE POLICY "Users can insert their own notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

COMMIT;
