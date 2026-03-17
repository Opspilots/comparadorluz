BEGIN;

ALTER TABLE suppliers
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS parent_group,
  DROP COLUMN IF EXISTS market_share_pct;

COMMIT;
