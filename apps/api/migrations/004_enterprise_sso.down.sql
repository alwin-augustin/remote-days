-- Rollback: Enterprise SSO tables
DROP INDEX IF EXISTS idx_user_identities_user;
DROP TABLE IF EXISTS user_identities;

DROP TRIGGER IF EXISTS trg_sso_settings_updated_at ON sso_settings;
DROP TABLE IF EXISTS sso_settings;
