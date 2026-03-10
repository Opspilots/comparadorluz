BEGIN;

-- commercial_id should be nullable: contracts can be created from comparator
-- without a commissioner assigned
ALTER TABLE contracts ALTER COLUMN commercial_id DROP NOT NULL;

COMMIT;
