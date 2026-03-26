-- Migration: Fix saved_comparisons trigger referencing wrong function name
-- The trigger created in 20260319200000 calls update_updated_at() which does not exist.
-- The correct function is update_updated_at_column() (defined in 20260203120000_create_core_tables.sql).

BEGIN;

DROP TRIGGER IF EXISTS set_updated_at_saved_comparisons ON saved_comparisons;
CREATE TRIGGER update_saved_comparisons_updated_at
    BEFORE UPDATE ON saved_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
