/**
 * Mock OIDC identity provider (development / testing only).
 *
 * Lets you exercise the whole enterprise SSO flow locally without an Entra ID
 * tenant: it serves a real discovery document, a real JWKS, and performs a real
 * authorization-code exchange with PKCE and RS256 ID tokens.
 *
 * Usage:
 *   npm run dev:mock-idp --workspace=@remotedays/api
 *
 * Then point the admin SSO settings at:
 *   issuer    http://localhost:4010
 *   client id mock-client
 *   secret    mock-secret
 *   tenant id 11111111-1111-1111-1111-111111111111
 *
 * Simulate different outcomes with query parameters on the authorize request:
 *   ?login_hint=someone@example.com   sign in as another user
 *   ?fail=access_denied               have the provider return an error
 *   ?unsigned=true                    emit a token signed by an unknown key
 *   ?tid=<guid>                       assert a different tenant
 *
 * WARNING: never run this in production. It trusts every client and user.
 */
import * as crypto from 'crypto';
import fastify from 'fastify';
import * as jwt from 'jsonwebtoken';

const PORT = parseInt(process.env.MOCK_IDP_PORT || '4010', 10);
const ISSUER = process.env.MOCK_IDP_ISSUER || `http://localhost:${PORT}`;
const CLIENT_ID = process.env.MOCK_IDP_CLIENT_ID || 'mock-client';
const CLIENT_SECRET = process.env.MOCK_IDP_CLIENT_SECRET || 'mock-secret';
const DEFAULT_TENANT = process.env.MOCK_IDP_TENANT_ID || '11111111-1111-1111-1111-111111111111';
const DEFAULT_EMAIL = process.env.MOCK_IDP_EMAIL || 'employee@remotedays.app';
const KEY_ID = 'mock-key-1';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

// Exported as a JWK so the API's JWKS -> KeyObject path is exercised for real.
const publicJwk = { ...(publicKey.export({ format: 'jwk' }) as crypto.JsonWebKey), kid: KEY_ID, alg: 'RS256', use: 'sig' };

interface PendingCode {
  email: string;
  tid: string;
  oid: string;
  sub: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  redirectUri: string;
  unsigned: boolean;
  issuedAt: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const codes = new Map<string, PendingCode>();

function base64UrlSha256(input: string): string {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sweepExpiredCodes(): void {
  const cutoff = Date.now() - CODE_TTL_MS;
  for (const [code, entry] of codes) {
    if (entry.issuedAt < cutoff) codes.delete(code);
  }
}

const server = fastify({ logger: false });

// OIDC token endpoints receive application/x-www-form-urlencoded. Fastify does
// not parse that by default, so register a parser rather than adding a
// dependency for this development-only script.
server.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (_request, body, done) => {
    try {
      done(null, Object.fromEntries(new URLSearchParams(body as string)));
    } catch (error) {
      done(error as Error, undefined);
    }
  }
);

server.get('/.well-known/openid-configuration', async () => ({
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: `${ISSUER}/token`,
  jwks_uri: `${ISSUER}/jwks`,
  end_session_endpoint: `${ISSUER}/logout`,
  response_types_supported: ['code'],
  subject_types_supported: ['pairwise'],
  id_token_signing_alg_values_supported: ['RS256'],
  scopes_supported: ['openid', 'profile', 'email'],
  token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
  code_challenge_methods_supported: ['S256'],
}));

server.get('/jwks', async () => ({ keys: [publicJwk] }));

server.get<{
  Querystring: {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    nonce?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    login_hint?: string;
    fail?: string;
    tid?: string;
    unsigned?: string;
  };
}>('/authorize', async (request, reply) => {
  const q = request.query;

  if (!q.redirect_uri || !q.client_id) {
    return reply.code(400).send({ error: 'invalid_request', error_description: 'missing client_id or redirect_uri' });
  }

  // Faithfully report a refusal back to the RP.
  if (q.fail) {
    const target = new URL(q.redirect_uri);
    target.searchParams.set('error', q.fail);
    target.searchParams.set('error_description', `mock provider denied the request (${q.fail})`);
    if (q.state) target.searchParams.set('state', q.state);
    return reply.redirect(target.toString());
  }

  sweepExpiredCodes();

  const email = (q.login_hint || DEFAULT_EMAIL).toLowerCase();
  const code = crypto.randomUUID();

  codes.set(code, {
    email,
    tid: q.tid || DEFAULT_TENANT,
    // Stable per-email object id, mimicking Entra's immutable `oid`.
    oid: crypto.createHash('sha256').update(email).digest('hex').slice(0, 32),
    sub: crypto.createHash('sha256').update(`pairwise:${email}`).digest('hex').slice(0, 32),
    nonce: q.nonce,
    codeChallenge: q.code_challenge,
    codeChallengeMethod: q.code_challenge_method,
    redirectUri: q.redirect_uri,
    unsigned: q.unsigned === 'true',
    issuedAt: Date.now(),
  });

  const target = new URL(q.redirect_uri);
  target.searchParams.set('code', code);
  if (q.state) target.searchParams.set('state', q.state);
  return reply.redirect(target.toString());
});

server.post<{
  Body: {
    grant_type?: string;
    code?: string;
    redirect_uri?: string;
    client_id?: string;
    client_secret?: string;
    code_verifier?: string;
  };
}>('/token', async (request, reply) => {
  const body = request.body ?? {};

  if (body.client_id !== CLIENT_ID || body.client_secret !== CLIENT_SECRET) {
    return reply.code(401).send({ error: 'invalid_client' });
  }
  if (body.grant_type !== 'authorization_code' || !body.code) {
    return reply.code(400).send({ error: 'unsupported_grant_type' });
  }

  const pending = codes.get(body.code);
  if (!pending) {
    return reply.code(400).send({ error: 'invalid_grant', error_description: 'unknown or expired code' });
  }
  // Single use.
  codes.delete(body.code);

  if (pending.redirectUri !== body.redirect_uri) {
    return reply.code(400).send({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
  }

  // Real PKCE validation, so a broken S256 implementation in the caller fails here.
  if (pending.codeChallenge) {
    if (pending.codeChallengeMethod !== 'S256') {
      return reply.code(400).send({ error: 'invalid_grant', error_description: 'unsupported code_challenge_method' });
    }
    if (!body.code_verifier || base64UrlSha256(body.code_verifier) !== pending.codeChallenge) {
      return reply.code(400).send({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: ISSUER,
    aud: CLIENT_ID,
    sub: pending.sub,
    oid: pending.oid,
    tid: pending.tid,
    email: pending.email,
    preferred_username: pending.email,
    name: pending.email,
    iat: now,
    exp: now + 3600,
    nonce: pending.nonce,
  };

  // `unsigned` lets tests prove the API rejects a token it cannot verify.
  const idToken = pending.unsigned
    ? jwt.sign(claims, crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey, {
        algorithm: 'RS256',
        keyid: 'attacker-key',
      })
    : jwt.sign(claims, privateKey, { algorithm: 'RS256', keyid: KEY_ID });

  return reply.send({
    access_token: crypto.randomUUID(),
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken,
  });
});

server.get('/logout', async (_request, reply) => reply.code(200).send({ ok: true }));

server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🧪 Mock OIDC provider listening on ${address}`);
  console.log(`   issuer:     ${ISSUER}`);
  console.log(`   client id:  ${CLIENT_ID}`);
  console.log(`   secret:     ${CLIENT_SECRET}`);
  console.log(`   tenant:     ${DEFAULT_TENANT}`);
  console.log(`   sign-in as: ${DEFAULT_EMAIL}`);
});
