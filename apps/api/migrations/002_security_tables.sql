-- Migration: 002_security_tables
-- Description: Add tables for login attempt tracking and security event logging
-- Date: 2024-12-28

-- 1. Login attempts table (for account lockout)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL, -- IPv6 can be up to 45 chars
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by email and time
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at DESC);

-- Index for IP-based analysis
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
  ON login_attempts (ip_address, created_at DESC);

-- Auto-cleanup: delete old login attempts after 30 days
-- (Run as a scheduled job or trigger)

-- 2. Security events table (audit log for security-related events)
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by event type
CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON security_events (event_type, created_at DESC);

-- Index for user-based lookups
CREATE INDEX IF NOT EXISTS idx_security_events_user
  ON security_events (user_id, created_at DESC);

-- Index for IP-based analysis
CREATE INDEX IF NOT EXISTS idx_security_events_ip
  ON security_events (ip_address, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE login_attempts IS 'Tracks login attempts for account lockout and security monitoring';
COMMENT ON TABLE security_events IS 'Immutable log of security-related events for audit and monitoring';

-- Record this migration
INSERT INTO schema_migrations (name) VALUES ('002_security_tables')
ON CONFLICT DO NOTHING;
