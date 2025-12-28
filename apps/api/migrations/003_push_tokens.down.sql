-- Rollback: Drop push tokens tables
DROP INDEX IF EXISTS idx_push_logs_created;
DROP INDEX IF EXISTS idx_push_logs_type;
DROP INDEX IF EXISTS idx_push_logs_user;
DROP TABLE IF EXISTS push_notification_logs;

DROP INDEX IF EXISTS idx_push_tokens_platform;
DROP INDEX IF EXISTS idx_push_tokens_active;
DROP INDEX IF EXISTS idx_push_tokens_user;
DROP TABLE IF EXISTS push_tokens;
