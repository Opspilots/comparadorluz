BEGIN;

-- ============================================================================
-- 1. PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(30) UNIQUE NOT NULL,
    display_name            VARCHAR(100) NOT NULL,
    price_monthly           DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly            DECIMAL(10,2) NOT NULL DEFAULT 0,
    stripe_price_monthly_id VARCHAR(100),
    stripe_price_yearly_id  VARCHAR(100),
    limits                  JSONB NOT NULL DEFAULT '{}',
    features                JSONB NOT NULL DEFAULT '{}',
    is_active               BOOLEAN NOT NULL DEFAULT true,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. ALTER companies — add billing columns (idempotent)
-- ============================================================================

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN plan_id UUID REFERENCES plans(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN stripe_customer_id VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN stripe_subscription_id VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN billing_interval VARCHAR(10) DEFAULT 'monthly';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN plan_expires_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- 3. USAGE_TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_key  VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    count        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, feature_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_company_period
    ON usage_tracking (company_id, period_start);

-- ============================================================================
-- 4. RLS FOR usage_tracking
-- ============================================================================

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_tracking_select_own" ON usage_tracking;
CREATE POLICY "usage_tracking_select_own"
    ON usage_tracking
    FOR SELECT
    USING (company_id = get_auth_company_id());

DROP POLICY IF EXISTS "usage_tracking_insert_own" ON usage_tracking;
CREATE POLICY "usage_tracking_insert_own"
    ON usage_tracking
    FOR INSERT
    WITH CHECK (company_id = get_auth_company_id());

DROP POLICY IF EXISTS "usage_tracking_update_own" ON usage_tracking;
CREATE POLICY "usage_tracking_update_own"
    ON usage_tracking
    FOR UPDATE
    USING (company_id = get_auth_company_id());

-- ============================================================================
-- 5. SEED PLAN TIERS
-- ============================================================================

INSERT INTO plans (name, display_name, price_monthly, price_yearly, sort_order, limits, features)
VALUES
(
    'free',
    'Gratis',
    0,
    0,
    0,
    '{"max_users": 1, "max_supply_points": 10, "ai_uses_per_month": 0, "comparisons_per_month": 5, "messages_per_month": 0, "max_customers": 10}',
    '{"crm": true, "comparator": true, "messaging": false, "commissioners": false, "compliance": false, "pdf_reports": false, "api_access": false, "advanced_analytics": false, "tariff_upload": false}'
),
(
    'standard',
    'Estándar',
    19,
    204,
    1,
    '{"max_users": 5, "max_supply_points": 50, "ai_uses_per_month": 100, "comparisons_per_month": -1, "messages_per_month": 500, "max_customers": -1}',
    '{"crm": true, "comparator": true, "messaging": true, "commissioners": true, "compliance": true, "pdf_reports": true, "api_access": false, "advanced_analytics": false, "tariff_upload": true}'
),
(
    'professional',
    'Profesional',
    49,
    528,
    2,
    '{"max_users": -1, "max_supply_points": -1, "ai_uses_per_month": -1, "comparisons_per_month": -1, "messages_per_month": -1, "max_customers": -1}',
    '{"crm": true, "comparator": true, "messaging": true, "commissioners": true, "compliance": true, "pdf_reports": true, "api_access": true, "advanced_analytics": true, "tariff_upload": true}'
)
ON CONFLICT (name) DO UPDATE SET
    display_name  = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly  = EXCLUDED.price_yearly,
    sort_order    = EXCLUDED.sort_order,
    limits        = EXCLUDED.limits,
    features      = EXCLUDED.features;

-- ============================================================================
-- 6. BACKFILL existing companies to free plan
-- ============================================================================

UPDATE companies
SET plan_id = (SELECT id FROM plans WHERE name = 'free')
WHERE plan_id IS NULL;

-- ============================================================================
-- 7. FUNCTION: increment_usage
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage(
    p_company_id  UUID,
    p_feature_key VARCHAR,
    p_amount      INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_period_start DATE := date_trunc('month', now())::date;
BEGIN
    INSERT INTO usage_tracking (company_id, feature_key, period_start, count)
    VALUES (p_company_id, p_feature_key, v_period_start, p_amount)
    ON CONFLICT (company_id, feature_key, period_start)
    DO UPDATE SET
        count      = usage_tracking.count + p_amount,
        updated_at = now();
END;
$$;

-- ============================================================================
-- 8. FUNCTION: get_company_plan
-- ============================================================================

CREATE OR REPLACE FUNCTION get_company_plan(p_company_id UUID)
RETURNS TABLE (
    plan_name VARCHAR,
    limits    JSONB,
    features  JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.name::VARCHAR AS plan_name,
        p.limits,
        p.features
    FROM companies c
    JOIN plans p ON p.id = c.plan_id
    WHERE c.id = p_company_id;
$$;

-- ============================================================================
-- 9. FUNCTION: get_monthly_usage
-- ============================================================================

CREATE OR REPLACE FUNCTION get_monthly_usage(p_company_id UUID)
RETURNS TABLE (
    feature_key  VARCHAR,
    count        INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ut.feature_key::VARCHAR,
        ut.count
    FROM usage_tracking ut
    WHERE ut.company_id   = p_company_id
      AND ut.period_start = date_trunc('month', now())::date;
$$;

COMMIT;
