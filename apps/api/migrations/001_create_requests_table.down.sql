-- Rollback: Drop requests table
DROP INDEX IF EXISTS idx_requests_status;
DROP INDEX IF EXISTS idx_requests_user;
DROP TABLE IF EXISTS requests;
