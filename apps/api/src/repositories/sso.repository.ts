import { Pool } from 'pg';

/** The single SSO configuration row for this deployment. */
export interface SsoSettings {
  display_name: string;
  issuer: string;
  tenant_id: string | null;
  client_id: string;
  client_secret_encrypted: string | null;
  scopes: string;
  allowed_email_domains: string[];
  auto_link_by_email: boolean;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SsoSettingsInput {
  display_name: string;
  issuer: string;
  tenant_id: string | null;
  client_id: string;
  /**
   * Encrypted client secret. `undefined` leaves any stored secret untouched
   * (so an admin can save the form without re-typing the secret), `null`
   * clears it, and a string replaces it.
   */
  client_secret_encrypted?: string | null;
  scopes: string;
  allowed_email_domains: string[];
  auto_link_by_email: boolean;
  is_enabled: boolean;
}

export interface UserIdentity {
  id: string;
  user_id: string;
  provider: string;
  tenant_id: string;
  subject_id: string;
  email_at_link: string | null;
  created_at: Date;
  last_login_at: Date | null;
}

export interface LinkedIdentity extends UserIdentity {
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
}

export interface ProvisionedUser {
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface ProvisionedUserDetail extends ProvisionedUser {
  first_name: string | null;
  last_name: string | null;
  country_of_residence: string;
  work_country: string;
}

export interface ISsoRepository {
  getSettings(): Promise<SsoSettings | null>;
  saveSettings(input: SsoSettingsInput): Promise<SsoSettings>;
  /** Distinct subjects already linked, for this provider. */
  findIdentity(provider: string, tenantId: string, subjectId: string): Promise<UserIdentity | null>;
  createIdentity(input: {
    userId: string;
    provider: string;
    tenantId: string;
    subjectId: string;
    emailAtLink: string | null;
  }): Promise<UserIdentity>;
  touchIdentity(id: string): Promise<void>;
  listIdentities(limit: number, offset: number): Promise<LinkedIdentity[]>;
  deleteIdentity(userId: string, provider: string): Promise<boolean>;
  /**
   * Matches pre-provisioned accounts by email. Deliberately does NOT filter on
   * `is_active` so callers can tell "deactivated" apart from "never provisioned"
   * instead of silently treating a disabled user as unknown.
   */
  findProvisionedUsersByEmail(email: string): Promise<ProvisionedUser[]>;
  /**
   * Loads a user row by id *without* the `is_active = true` filter that
   * UserRepository applies, so callers can report "deactivated" rather than
   * mistaking a disabled account for a missing one.
   */
  findUserById(userId: string): Promise<ProvisionedUserDetail | null>;
}

export class SsoRepository implements ISsoRepository {
  constructor(private pool: Pool) {}

  async getSettings(): Promise<SsoSettings | null> {
    const { rows } = await this.pool.query<SsoSettings>('SELECT * FROM sso_settings LIMIT 1');
    return rows[0] || null;
  }

  async saveSettings(input: SsoSettingsInput): Promise<SsoSettings> {
    const keepSecret = input.client_secret_encrypted === undefined;
    const secret = keepSecret ? null : input.client_secret_encrypted;

    const { rows } = await this.pool.query<SsoSettings>(
      `INSERT INTO sso_settings (
         id, display_name, issuer, tenant_id, client_id, client_secret_encrypted,
         scopes, allowed_email_domains, auto_link_by_email, is_enabled
       ) VALUES (true, $1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         issuer = EXCLUDED.issuer,
         tenant_id = EXCLUDED.tenant_id,
         client_id = EXCLUDED.client_id,
         client_secret_encrypted = CASE WHEN $10 THEN sso_settings.client_secret_encrypted
                                        ELSE EXCLUDED.client_secret_encrypted END,
         scopes = EXCLUDED.scopes,
         allowed_email_domains = EXCLUDED.allowed_email_domains,
         auto_link_by_email = EXCLUDED.auto_link_by_email,
         is_enabled = EXCLUDED.is_enabled
       RETURNING *`,
      [
        input.display_name,
        input.issuer,
        input.tenant_id,
        input.client_id,
        secret,
        input.scopes,
        input.allowed_email_domains,
        input.auto_link_by_email,
        input.is_enabled,
        keepSecret,
      ]
    );
    return rows[0];
  }

  async findIdentity(provider: string, tenantId: string, subjectId: string): Promise<UserIdentity | null> {
    const { rows } = await this.pool.query<UserIdentity>(
      `SELECT * FROM user_identities
       WHERE provider = $1 AND tenant_id = $2 AND subject_id = $3`,
      [provider, tenantId, subjectId]
    );
    return rows[0] || null;
  }

  async createIdentity(input: {
    userId: string;
    provider: string;
    tenantId: string;
    subjectId: string;
    emailAtLink: string | null;
  }): Promise<UserIdentity> {
    const { rows } = await this.pool.query<UserIdentity>(
      `INSERT INTO user_identities (user_id, provider, tenant_id, subject_id, email_at_link, last_login_at)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING *`,
      [input.userId, input.provider, input.tenantId, input.subjectId, input.emailAtLink]
    );
    return rows[0];
  }

  async touchIdentity(id: string): Promise<void> {
    await this.pool.query('UPDATE user_identities SET last_login_at = now() WHERE id = $1', [id]);
  }

  async listIdentities(limit: number, offset: number): Promise<LinkedIdentity[]> {
    const { rows } = await this.pool.query<LinkedIdentity>(
      `SELECT ui.*, u.email, u.first_name, u.last_name, u.role, u.is_active
       FROM user_identities ui
       JOIN users u ON u.user_id = ui.user_id
       ORDER BY ui.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  async deleteIdentity(userId: string, provider: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_identities WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findProvisionedUsersByEmail(email: string): Promise<ProvisionedUser[]> {
    const { rows } = await this.pool.query<ProvisionedUser>(
      `SELECT user_id, email, role, is_active
       FROM users
       WHERE lower(email) = lower($1)`,
      [email]
    );
    return rows;
  }

  async findUserById(userId: string): Promise<ProvisionedUserDetail | null> {
    const { rows } = await this.pool.query<ProvisionedUserDetail>(
      `SELECT user_id, email, role, is_active, first_name, last_name,
              country_of_residence, work_country
       FROM users
       WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }
}
