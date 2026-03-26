-- Migration: Add missing updated_at triggers
-- Tables campaigns and notification_settings have updated_at columns but no auto-update trigger.
-- Convention: every table with updated_at must have a BEFORE UPDATE trigger calling update_updated_at_column().

BEGIN;

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
