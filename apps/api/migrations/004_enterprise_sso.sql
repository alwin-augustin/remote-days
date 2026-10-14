-- Migration: Enterprise SSO (OIDC) for pre-provisioned employees
--
-- Design notes
-- ------------
-- Accounts are created by HR (CSV import / admin UI) and are NEVER created by an
-- identity provider. The IdP only authenticates; this application still owns
-- authorization (users.role) and the compliance data (country_of_residence,
-- work_country). There is deliberately no "just-in-time provisioning" path.
--
-- sso_settings is a singleton: a self-hosted deployment federates to exactly one
-- corporate identity provider.

CREATE TABLE IF NOT EXISTS sso_settings (
  -- Boolean primary key pinned to true => at most one row can ever exist.
  id BOOLEAN PRIMARY KEY DEFAULT true,
  CONSTRAINT sso_settings_singleton CHECK (id),

  -- Label shown on the login button, e.g. "Microsoft".
  display_name TEXT NOT NULL DEFAULT 'Microsoft',
  -- Issuer identifier URL, e.g. https://login.microsoftonline.com/<tenant>/v2.0
  issuer TEXT NOT NULL,
  -- When set, the `tid` claim must match this value exactly. This is what makes
  -- it safe to accept a corporate directory as the source of identity, and it is
  -- what stops arbitrary personal Microsoft accounts from reaching the app.
  tenant_id TEXT,
  client_id TEXT NOT NULL,
  -- Encrypted with utils/crypto.ts (never stored in plaintext).
  client_secret_encrypted TEXT,
  scopes TEXT NOT NULL DEFAULT 'openid profile email',
  -- Optional allowlist; when non-empty the sign-in email's domain must be listed.
  allowed_email_domains TEXT[] NOT NULL DEFAULT '{}',
  -- Bind an existing local account on first SSO login by matching its email.
  -- Safe only because tenant_id pins the directory; set false to require an
  -- administrator to link identities explicitly.
  auto_link_by_email BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sso_settings_updated_at
BEFORE UPDATE ON sso_settings
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Binds an external OIDC identity to a pre-existing application user.
-- The link key is (issuer, tenant_id, subject_id): the subject is the immutable
-- directory object id (Entra `oid`), never the mutable email or UPN.
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  -- Issuer URL of the identity provider that asserted this identity.
  provider TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  -- The email observed when the link was created, for support/audit only.
  email_at_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT uq_user_identities_subject UNIQUE (provider, tenant_id, subject_id),
  -- One identity per provider per user.
  CONSTRAINT uq_user_identities_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities (user_id);

COMMENT ON TABLE sso_settings IS 'Singleton configuration for the corporate OIDC identity provider';
COMMENT ON TABLE user_identities IS 'Links immutable external OIDC subjects to pre-provisioned application users';
