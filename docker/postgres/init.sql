-- Enable UUID generation (one-time)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. Status type
CREATE TYPE work_status AS ENUM ('home','office','travel','sick','unknown');

-- 1. users
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  country_of_residence CHAR(2) NOT NULL, -- ISO code
  work_country CHAR(2) NOT NULL,          -- ISO code
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'hr', 'admin')),

  slack_user_id VARCHAR(100),              -- optional
  notification_method VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email','slack','teams','web'

  is_active BOOLEAN NOT NULL DEFAULT true,

  password_hash TEXT NOT NULL, -- store bcrypt hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. entries (daily declarations)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status work_status NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT 'user', -- 'user','slack_bot','email_link','hr_correction','api'
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_entries_user_date UNIQUE (user_id, date)
);

-- trigger to set updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entries_updated_at
BEFORE UPDATE ON entries
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 3. audit_logs (immutable audit trail)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID, -- Removed REFERENCES entries(id) ON DELETE SET NULL
  actor_user_id UUID REFERENCES users(user_id), -- who caused the change (nullable for system)
  action TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','OVERRIDE','SYSTEM')),
  previous_status work_status,
  new_status work_status,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb, -- extra context (e.g., token used)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. country_thresholds
CREATE TABLE country_thresholds (
  country_code CHAR(2) PRIMARY KEY,
  max_remote_days INTEGER NOT NULL CHECK (max_remote_days >= 0)
);

-- seed defaults (idempotent)
INSERT INTO country_thresholds (country_code, max_remote_days)
VALUES ('FR', 34), ('BE', 34), ('DE', 34)
ON CONFLICT (country_code) DO NOTHING;

-- 5. holidays (to skip sending prompts)
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  country_code CHAR(2), -- NULL = global/company-wide holiday
  description TEXT,
  CONSTRAINT uq_holidays_date_country UNIQUE (date, country_code)
);

-- 6. notifications (history of sent alerts)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  channel TEXT, -- 'email','slack'
  notification_type TEXT, -- e.g., 'daily_prompt','warning_75','warning_90','breach'
  payload JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. email CTA tokens (one-click email links)
-- token should be a random string/uuid. For stronger security you can store hash instead.
CREATE TABLE email_cta_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- send this token in CTA link
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('home','office', 'password-reset')),
  target_date DATE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_cta_user ON email_cta_tokens (user_id);
CREATE INDEX idx_email_cta_expires ON email_cta_tokens (expires_at);

-- 8. schema_migrations (tracking)
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. helpful indexes
CREATE INDEX idx_entries_user_date ON entries (user_id, date);
CREATE INDEX idx_entries_date ON entries (date);
CREATE INDEX idx_entries_status ON entries (status);
CREATE INDEX idx_users_country_of_res ON users (country_of_residence);
CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_audit_created_at ON audit_logs (created_at);

-- 10. trigger to write audit log automatically (for INSERT/UPDATE/DELETE on entries)
-- This function writes an audit log row capturing previous/new status and actor info (if provided in CURRENT_SETTING).
CREATE OR REPLACE FUNCTION audit_entries_change()
RETURNS TRIGGER AS $$
DECLARE
  actor TEXT;
  actor_uuid UUID;
  reason TEXT;
BEGIN
  -- optionally set actor in session: set_config('app.actor_user_id', '<uuid>', true);
  actor := current_setting('app.actor_user_id', true);
  IF actor IS NOT NULL THEN
    actor_uuid := actor::uuid;
  ELSE
    actor_uuid := NULL;
  END IF;

  -- optionally set reason in session: set_config('app.actor_reason', '<reason>', true);
  reason := current_setting('app.actor_reason', true);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs(entry_id, actor_user_id, action, previous_status, new_status, reason, details)
    VALUES (NEW.id, actor_uuid, 'CREATE', NULL, NEW.status, reason, jsonb_build_object('source', NEW.source));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(entry_id, actor_user_id, action, previous_status, new_status, reason, details)
    VALUES (NEW.id, actor_uuid, 'UPDATE', OLD.status, NEW.status, reason, jsonb_build_object('source', NEW.source));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(entry_id, actor_user_id, action, previous_status, new_status, reason, details)
    VALUES (OLD.id, actor_uuid, 'DELETE', OLD.status, NULL, reason, jsonb_build_object('source', OLD.source));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_entries
AFTER INSERT OR UPDATE OR DELETE ON entries
FOR EACH ROW EXECUTE FUNCTION audit_entries_change();

-- Done