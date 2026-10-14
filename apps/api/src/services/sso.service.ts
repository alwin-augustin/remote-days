import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { UserInfo, UserRole } from '@remotedays/types';
import { config } from '../config/env';
import { AppError } from '../errors/app-error';
import { encrypt, decrypt } from '../utils/crypto';
import { signSessionToken } from '../auth/session';
import {
  ISsoRepository,
  SsoSettings,
  SsoSettingsInput,
  LinkedIdentity,
} from '../repositories/sso.repository';

/**
 * Enterprise SSO (OIDC) service.
 *
 * Posture: **link-only, deny by default**. Accounts are created by HR and are
 * never provisioned from an identity provider. The IdP authenticates; this app
 * still owns authorization (`users.role`) and all compliance data.
 *
 * The only thing this service produces is the same session JWT that the
 * password login path produces, so every downstream consumer
 * (plugins/auth.ts, all protected routes, the SPA) is untouched.
 */

// --- OIDC discovery metadata (the subset we rely on) -------------------------

export interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported?: string[];
  end_session_endpoint?: string;
}

interface Jwks {
  keys: crypto.JsonWebKey[];
}

export interface SsoFlowState {
  state: string;
  nonce: string;
  codeVerifier: string;
  /** Where to send the browser after a successful login (app-relative path). */
  redirectTo: string;
}

export interface SsoPublicConfig {
  enabled: boolean;
  displayName: string;
}

export interface SsoLoginResult {
  token: string;
  user: UserInfo;
  /** True when this login created the user_identities link. */
  linked: boolean;
}

export interface SsoAdminSettings {
  displayName: string;
  issuer: string;
  tenantId: string | null;
  clientId: string;
  scopes: string;
  allowedEmailDomains: string[];
  autoLinkByEmail: boolean;
  isEnabled: boolean;
  hasClientSecret: boolean;
  updatedAt: Date | null;
}

export interface SsoConnectionTestResult {
  ok: boolean;
  message: string;
  metadata?: {
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    jwksUri: string;
    signingAlgorithms: string[];
    keyCount: number;
  };
}

/** Machine-readable reason codes surfaced to the login page. */
export type SsoFailureCode =
  | 'disabled'
  | 'not_configured'
  | 'provider_error'
  | 'invalid_request'
  | 'invalid_token'
  | 'tenant_mismatch'
  | 'domain_not_allowed'
  | 'not_provisioned'
  | 'deactivated'
  | 'ambiguous_account';

export class SsoError extends AppError {
  constructor(public readonly ssoCode: SsoFailureCode, message: string, statusCode = 403) {
    super(message, statusCode);
  }
}

const DISCOVERY_TTL_MS = 10 * 60 * 1000;
const JWKS_TTL_MS = 10 * 60 * 1000;
const FLOW_TTL_SECONDS = 10 * 60;
const HTTP_TIMEOUT_MS = 10 * 1000;
const MAX_EMAIL_LENGTH = 255;

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = toBase64Url(crypto.randomBytes(32));
  const challenge = toBase64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw new SsoError(
      'provider_error',
      `Could not reach the identity provider: ${(error as Error).message}`,
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

export class SsoService {
  private metadataCache = new Map<string, { value: OidcMetadata; expiresAt: number }>();
  private jwksCache = new Map<string, { value: Jwks; expiresAt: number }>();

  constructor(private readonly ssoRepo: ISsoRepository) {}

  // ---------------------------------------------------------------- settings

  async getSettings(): Promise<SsoSettings | null> {
    return this.ssoRepo.getSettings();
  }

  async getPublicConfig(): Promise<SsoPublicConfig> {
    const settings = await this.ssoRepo.getSettings();
    if (!settings || !settings.is_enabled) {
      return { enabled: false, displayName: 'SSO' };
    }
    return { enabled: true, displayName: settings.display_name };
  }

  async getAdminSettings(): Promise<SsoAdminSettings | null> {
    const settings = await this.ssoRepo.getSettings();
    if (!settings) return null;
    return {
      displayName: settings.display_name,
      issuer: settings.issuer,
      tenantId: settings.tenant_id,
      clientId: settings.client_id,
      scopes: settings.scopes,
      allowedEmailDomains: settings.allowed_email_domains,
      autoLinkByEmail: settings.auto_link_by_email,
      isEnabled: settings.is_enabled,
      hasClientSecret: Boolean(settings.client_secret_encrypted),
      updatedAt: settings.updated_at ?? null,
    };
  }

  async updateSettings(input: SsoSettingsInput): Promise<SsoAdminSettings> {
    // Validate the discovery document before persisting, so a typo in the issuer
    // fails at save time rather than locking users out at first login.
    await this.discover(input.issuer, true);

    await this.ssoRepo.saveSettings(input);
    const saved = await this.getAdminSettings();
    if (!saved) throw new AppError('Failed to save SSO settings', 500);
    return saved;
  }

  async testConnection(input: {
    issuer: string;
  }): Promise<SsoConnectionTestResult> {
    try {
      const metadata = await this.discover(input.issuer, true);
      const jwks = await this.getJwks(metadata.jwks_uri, true);
      return {
        ok: true,
        message: 'Discovery document and signing keys retrieved successfully.',
        metadata: {
          issuer: metadata.issuer,
          authorizationEndpoint: metadata.authorization_endpoint,
          tokenEndpoint: metadata.token_endpoint,
          jwksUri: metadata.jwks_uri,
          signingAlgorithms: metadata.id_token_signing_alg_values_supported ?? [],
          keyCount: jwks.keys.length,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: (error as Error).message };
    }
  }

  async listIdentities(limit: number, offset: number): Promise<LinkedIdentity[]> {
    return this.ssoRepo.listIdentities(limit, offset);
  }

  async unlinkIdentity(userId: string, provider?: string): Promise<boolean> {
    const settings = await this.ssoRepo.getSettings();
    const providerKey = provider ?? settings?.issuer;
    if (!providerKey) throw new AppError('SSO is not configured', 400);
    return this.ssoRepo.deleteIdentity(userId, providerKey);
  }

  // --------------------------------------------------------------- discovery

  private async discover(issuer: string, forceRefresh = false): Promise<OidcMetadata> {
    const normalized = issuer.replace(/\/$/, '');
    const cached = this.metadataCache.get(normalized);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const url = `${normalized}/.well-known/openid-configuration`;
    const response = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });

    if (!response.ok) {
      throw new SsoError(
        'provider_error',
        `Identity provider discovery failed (HTTP ${response.status}) at ${url}`,
        502
      );
    }

    const metadata = (await response.json()) as Partial<OidcMetadata>;
    if (!metadata.issuer || !metadata.authorization_endpoint || !metadata.token_endpoint || !metadata.jwks_uri) {
      throw new SsoError('provider_error', 'Discovery document is missing required endpoints', 502);
    }

    const value: OidcMetadata = {
      issuer: metadata.issuer,
      authorization_endpoint: metadata.authorization_endpoint,
      token_endpoint: metadata.token_endpoint,
      jwks_uri: metadata.jwks_uri,
      id_token_signing_alg_values_supported: metadata.id_token_signing_alg_values_supported,
      end_session_endpoint: metadata.end_session_endpoint,
    };

    this.metadataCache.set(normalized, { value, expiresAt: Date.now() + DISCOVERY_TTL_MS });
    return value;
  }

  private async getJwks(jwksUri: string, forceRefresh = false): Promise<Jwks> {
    const cached = this.jwksCache.get(jwksUri);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const response = await fetchWithTimeout(jwksUri, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      throw new SsoError('provider_error', `Could not fetch signing keys (HTTP ${response.status})`, 502);
    }

    const value = (await response.json()) as Jwks;
    if (!Array.isArray(value.keys) || value.keys.length === 0) {
      throw new SsoError('provider_error', 'Identity provider returned no signing keys', 502);
    }

    this.jwksCache.set(jwksUri, { value, expiresAt: Date.now() + JWKS_TTL_MS });
    return value;
  }

  // ------------------------------------------------------------------- flow

  /** Builds the authorization URL and the signed, short-lived flow cookie value. */
  async startLogin(redirectTo = '/'): Promise<{ authorizationUrl: string; flowToken: string }> {
    const settings = await this.ssoRepo.getSettings();
    if (!settings || !settings.is_enabled) {
      throw new SsoError('disabled', 'Single sign-on is not enabled for this deployment');
    }

    const metadata = await this.discover(settings.issuer);
    const { verifier, challenge } = generatePkcePair();
    const state = toBase64Url(crypto.randomBytes(24));
    const nonce = toBase64Url(crypto.randomBytes(24));

    const flow: SsoFlowState = { state, nonce, codeVerifier: verifier, redirectTo: this.sanitizeRedirect(redirectTo) };

    const params = new URLSearchParams({
      client_id: settings.client_id,
      response_type: 'code',
      redirect_uri: this.redirectUri(),
      scope: settings.scopes,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      response_mode: 'query',
    });

    const flowToken = jwt.sign(flow, config.JWT_SECRET, { expiresIn: FLOW_TTL_SECONDS });

    return { authorizationUrl: `${metadata.authorization_endpoint}?${params.toString()}`, flowToken };
  }

  /**
   * Verifies and decodes the flow cookie. Because the payload is signed, a
   * tampered state/nonce/verifier is rejected before any token exchange.
   */
  verifyFlowToken(flowToken: string | undefined): SsoFlowState {
    if (!flowToken) {
      throw new SsoError('invalid_request', 'Missing login transaction. Please start the sign-in again.', 400);
    }
    try {
      const payload = jwt.verify(flowToken, config.JWT_SECRET) as jwt.JwtPayload & SsoFlowState;
      if (!payload.state || !payload.nonce || !payload.codeVerifier) {
        throw new Error('incomplete flow payload');
      }
      return {
        state: payload.state,
        nonce: payload.nonce,
        codeVerifier: payload.codeVerifier,
        redirectTo: payload.redirectTo || '/',
      };
    } catch {
      throw new SsoError('invalid_request', 'Login transaction expired or invalid. Please try again.', 400);
    }
  }

  /** Callback URL registered with the IdP. Must point at this API, not the web app. */
  redirectUri(): string {
    return `${config.API_PUBLIC_URL}/v1/auth/sso/callback`;
  }

  /**
   * Completes the authorization code flow and returns an application session.
   * Never creates a user: an unmatched identity is rejected.
   */
  async completeLogin(params: {
    code: string | undefined;
    state: string | undefined;
    flow: SsoFlowState;
    currentUrl: string;
  }): Promise<SsoLoginResult> {
    const settings = await this.ssoRepo.getSettings();
    if (!settings || !settings.is_enabled) {
      throw new SsoError('disabled', 'Single sign-on is not enabled for this deployment');
    }

    if (!params.code) {
      throw new SsoError('invalid_request', 'The identity provider did not return an authorization code', 400);
    }

    // The `state` from the IdP must match what we stored in the signed cookie.
    if (!params.state || params.state !== params.flow.state) {
      throw new SsoError('invalid_request', 'Sign-in state did not match. Please start again.', 400);
    }

    const metadata = await this.discover(settings.issuer);
    const idToken = await this.exchangeCode(settings, metadata, params.code, params.flow.codeVerifier, params.currentUrl);
    const claims = await this.verifyIdToken(settings, metadata, idToken, params.flow.nonce);

    const subjectId = this.subjectFromClaims(claims);
    const tenantId = String(claims.tid ?? settings.tenant_id ?? '');

    // Tenant pinning: when configured, only identities from that directory pass.
    if (settings.tenant_id && String(claims.tid ?? '') !== settings.tenant_id) {
      throw new SsoError('tenant_mismatch', 'This account belongs to a different organisation.');
    }

    const email = this.emailFromClaims(claims);
    if (email && settings.allowed_email_domains.length > 0) {
      const domain = emailDomain(email);
      if (!domain || !settings.allowed_email_domains.map((d) => d.toLowerCase()).includes(domain)) {
        throw new SsoError('domain_not_allowed', 'Your email domain is not permitted for this application.');
      }
    }

    const resolved = await this.resolveUser(settings, tenantId, subjectId, email);
    const identity = resolved.existingIdentity;

    if (identity) {
      await this.ssoRepo.touchIdentity(identity.id);
    }

    return {
      token: signSessionToken({
        userId: resolved.user.user_id,
        email: resolved.user.email,
        role: resolved.user.role as UserRole,
      }),
      user: {
        user_id: resolved.user.user_id,
        email: resolved.user.email,
        first_name: resolved.user.first_name ?? '',
        last_name: resolved.user.last_name ?? '',
        role: resolved.user.role as UserRole,
        country_of_residence: resolved.user.country_of_residence,
        work_country: resolved.user.work_country,
      },
      linked: resolved.linked,
    };
  }

  /**
   * Link-only resolution:
   *   1. an existing (provider, tenant, subject) link wins;
   *   2. otherwise, if auto-linking is on, bind to exactly one matching
   *      pre-provisioned account by email;
   *   3. otherwise deny. No account is ever created here.
   */
  private async resolveUser(
    settings: SsoSettings,
    tenantId: string,
    subjectId: string,
    email: string | null
  ): Promise<{
    user: NonNullable<Awaited<ReturnType<ISsoRepository['findUserById']>>>;
    existingIdentity: Awaited<ReturnType<ISsoRepository['findIdentity']>>;
    linked: boolean;
  }> {
    const existingIdentity = await this.ssoRepo.findIdentity(settings.issuer, tenantId, subjectId);
    if (existingIdentity) {
      const user = await this.ssoRepo.findUserById(existingIdentity.user_id);
      if (!user) {
        throw new SsoError('not_provisioned', 'Your account is no longer available. Please contact HR.');
      }
      this.assertActive(user.is_active);
      return { user, existingIdentity, linked: false };
    }

    if (!settings.auto_link_by_email) {
      throw new SsoError(
        'not_provisioned',
        'This sign-in is not linked to an account yet. Ask an administrator to link it.'
      );
    }

    if (!email) {
      throw new SsoError(
        'not_provisioned',
        'Your identity provider did not supply an email address, so we could not match your account.'
      );
    }

    const matches = await this.ssoRepo.findProvisionedUsersByEmail(email);
    if (matches.length === 0) {
      throw new SsoError(
        'not_provisioned',
        'No account is provisioned for this address. Please contact your HR administrator.'
      );
    }
    if (matches.length > 1) {
      // Fail closed: never guess which account an identity belongs to.
      throw new SsoError(
        'ambiguous_account',
        'Several accounts match this address. Please ask an administrator to link your account.'
      );
    }

    this.assertActive(matches[0].is_active);

    await this.ssoRepo.createIdentity({
      userId: matches[0].user_id,
      provider: settings.issuer,
      tenantId,
      subjectId,
      emailAtLink: email,
    });

    const user = await this.ssoRepo.findUserById(matches[0].user_id);
    if (!user) {
      throw new SsoError('not_provisioned', 'No account is provisioned for this address.');
    }

    return { user, existingIdentity: null, linked: true };
  }

  private assertActive(isActive: boolean): void {
    if (!isActive) {
      throw new SsoError('deactivated', 'Your account has been deactivated. Please contact your HR administrator.');
    }
  }

  private async exchangeCode(
    settings: SsoSettings,
    metadata: OidcMetadata,
    code: string,
    codeVerifier: string,
    currentUrl: string
  ): Promise<string> {
    const secret = settings.client_secret_encrypted ? decrypt(settings.client_secret_encrypted) : undefined;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
      client_id: settings.client_id,
      code_verifier: codeVerifier,
    });
    if (secret) body.set('client_secret', secret);

    const response = await fetchWithTimeout(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: body.toString(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new SsoError(
        'provider_error',
        `Token exchange failed (HTTP ${response.status}). ${detail ? `Provider said: ${detail.slice(0, 300)}` : ''}`.trim(),
        502
      );
    }

    const payload = (await response.json()) as { id_token?: string };
    if (!payload.id_token) {
      throw new SsoError('provider_error', 'Identity provider did not return an ID token', 502);
    }
    // `currentUrl` is accepted for future use (e.g. fragment parsing) but the
    // exchange above is authoritative.
    void currentUrl;
    return payload.id_token;
  }

  /** Verifies the ID token signature against the provider's JWKS plus iss/aud/exp/nonce. */
  private async verifyIdToken(
    settings: SsoSettings,
    metadata: OidcMetadata,
    idToken: string,
    expectedNonce: string
  ): Promise<jwt.JwtPayload> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new SsoError('invalid_token', 'The identity provider returned a malformed ID token.');
    }

    const kid = decoded.header.kid;

    const algorithms = (
      metadata.id_token_signing_alg_values_supported?.filter((a) => a.startsWith('RS') || a.startsWith('ES')) ?? [
        'RS256',
      ]
    ) as jwt.Algorithm[];

    /**
     * One verification attempt. `null` means the signing key was absent from the
     * supplied key set (as opposed to the token being invalid).
     */
    const attempt = async (forceRefresh: boolean): Promise<jwt.JwtPayload | null> => {
      const jwks = await this.getJwks(metadata.jwks_uri, forceRefresh);
      const jwk = kid
        ? jwks.keys.find((k) => k.kid === kid)
        : jwks.keys.length === 1
          ? jwks.keys[0]
          : undefined;
      if (!jwk) return null;

      return jwt.verify(idToken, crypto.createPublicKey({ key: jwk, format: 'jwk' }), {
        algorithms,
        issuer: metadata.issuer,
        audience: settings.client_id,
        clockTolerance: 60,
      }) as jwt.JwtPayload;
    };

    // Providers rotate signing keys. A cached key set can therefore be missing
    // the key (new kid) *or* hold a stale key under a reused kid, so retry once
    // against freshly fetched keys before rejecting the login.
    let claims: jwt.JwtPayload | null = null;
    let lastError: Error | undefined;

    for (const forceRefresh of [false, true]) {
      try {
        claims = await attempt(forceRefresh);
        if (claims) break;
        lastError = new Error('signing key not found in the provider key set');
      } catch (error) {
        lastError = error as Error;
      }
    }

    if (!claims) {
      throw new SsoError('invalid_token', `ID token validation failed: ${lastError?.message ?? 'unknown error'}`);
    }

    if (claims.nonce !== expectedNonce) {
      throw new SsoError('invalid_token', 'ID token nonce did not match the login request.');
    }

    return claims;
  }

  /**
   * The immutable subject for this identity. Entra's `oid` is stable across
   * applications in a tenant; `sub` is the OIDC fallback and is pairwise.
   * Mutable values such as email/UPN are never used as the key.
   */
  private subjectFromClaims(claims: jwt.JwtPayload): string {
    const subject = claims.oid ?? claims.sub;
    if (!subject) {
      throw new SsoError('invalid_token', 'ID token did not contain a subject identifier.');
    }
    return String(subject);
  }

  private emailFromClaims(claims: jwt.JwtPayload): string | null {
    const candidate = (claims.email ?? claims.preferred_username) as unknown;
    if (typeof candidate !== 'string') return null;
    const email = candidate.trim().toLowerCase();
    if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !email.includes('@')) return null;
    return email;
  }

  /** Only app-relative redirects are honoured (no open-redirect via the flow cookie). */
  private sanitizeRedirect(redirectTo: string): string {
    if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
      return '/';
    }
    return redirectTo;
  }

  /** Encrypts a client secret for storage. */
  static encryptSecret(secret: string): string {
    return encrypt(secret);
  }
}
