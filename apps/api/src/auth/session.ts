import * as jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface SessionClaims {
  userId: string;
  email: string;
  role: string;
}

/**
 * Mints the application session JWT.
 *
 * Single source of truth for *both* login paths. Password login and SSO must
 * produce byte-identical session tokens, otherwise `plugins/auth.ts` would have
 * to special-case how a session was created — which is exactly the coupling this
 * design avoids.
 */
export function signSessionToken(claims: SessionClaims): string {
  return jwt.sign(claims, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRATION } as jwt.SignOptions);
}

export interface SessionCookieOptions {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax';
}

/**
 * Cookie attributes for the session cookie. Shared so an SSO session is stored
 * exactly like a password session (the web app talks to the API cross-origin in
 * production, hence SameSite=None + Secure there).
 */
export function sessionCookieOptions(): SessionCookieOptions {
  const isProduction = config.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
}
