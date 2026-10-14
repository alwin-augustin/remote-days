import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/env';
import { SsoError, SsoService, SsoFailureCode } from '../services/sso.service';
import { SecurityService, SecurityEventTypes } from '../services/security.service';
import { sessionCookieOptions } from './session';

/**
 * Public SSO endpoints.
 *
 * These run *outside* authentication: they are how a session is created. The
 * only artifact they produce is the same `token` cookie the password login
 * issues, so nothing downstream needs to know SSO exists.
 *
 * Every failure is a redirect back to the SPA with a machine-readable
 * `sso_error` code — the user is in a browser, not an API client, so returning
 * JSON would strand them on a blank page.
 */

export const SSO_FLOW_COOKIE = 'sso_flow';

function flowCookieOptions() {
  const isProduction = config.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    // Must be Lax (not None/Strict): the IdP returns the browser here via a
    // cross-site top-level GET, which is exactly what Lax cookies are sent on.
    sameSite: 'lax' as const,
    maxAge: 10 * 60,
  };
}

export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly securityService: SecurityService
  ) {}

  private getClientInfo(request: FastifyRequest) {
    return {
      ip: request.ip || (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown',
      userAgent: (request.headers['user-agent'] as string) || 'unknown',
    };
  }

  /** Tells the login page whether to render the SSO button. */
  statusHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.ssoService.getPublicConfig());
  };

  startHandler = async (
    request: FastifyRequest<{ Querystring: { redirect?: string } }>,
    reply: FastifyReply
  ) => {
    const redirectTo = typeof request.query?.redirect === 'string' ? request.query.redirect : '/';
    const { ip, userAgent } = this.getClientInfo(request);

    try {
      const { authorizationUrl, flowToken } = await this.ssoService.startLogin(redirectTo);
      return reply.setCookie(SSO_FLOW_COOKIE, flowToken, flowCookieOptions()).redirect(authorizationUrl);
    } catch (error) {
      const code: SsoFailureCode = error instanceof SsoError ? error.ssoCode : 'provider_error';
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.SSO_LOGIN_FAILURE,
        ip,
        userAgent,
        { stage: 'start', code }
      );
      return this.redirectToLogin(reply, code);
    }
  };

  callbackHandler = async (
    request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string; error_description?: string } }>,
    reply: FastifyReply
  ) => {
    const { ip, userAgent } = this.getClientInfo(request);
    const query = request.query ?? {};

    // The provider can report a user-facing error instead of a code (e.g. the
    // user cancelled, or conditional access blocked the sign-in).
    if (query.error) {
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.SSO_LOGIN_FAILURE,
        ip,
        userAgent,
        { stage: 'callback', providerError: query.error }
      );
      return this.redirectToLogin(reply, 'provider_error');
    }

    let emailForAudit: string | undefined;

    try {
      const flow = this.ssoService.verifyFlowToken(request.cookies?.[SSO_FLOW_COOKIE]);
      const result = await this.ssoService.completeLogin({
        code: query.code,
        state: query.state,
        flow,
        currentUrl: request.url,
      });

      emailForAudit = result.user.email;

      // SSO logins are recorded exactly like password logins so lockout and
      // audit reporting stay consistent, but password lockout state is cleared
      // rather than incremented (there is no password to guess).
      await this.securityService.recordLoginAttempt(result.user.email, ip, userAgent, true);
      await this.securityService.clearLoginAttempts(result.user.email);
      await this.securityService.logSecurityEvent(
        result.linked ? SecurityEventTypes.SSO_IDENTITY_LINKED : SecurityEventTypes.SSO_LOGIN_SUCCESS,
        ip,
        userAgent,
        { linked: result.linked, sso: true },
        result.user.user_id,
        result.user.email
      );

      return reply
        .clearCookie(SSO_FLOW_COOKIE, { path: '/' })
        .setCookie('token', result.token, sessionCookieOptions())
        .redirect(`${config.APP_URL}${flow.redirectTo}`);
    } catch (error) {
      const code: SsoFailureCode = error instanceof SsoError ? error.ssoCode : 'provider_error';
      const message = error instanceof Error ? error.message : 'SSO login failed';

      await this.securityService.logSecurityEvent(
        SecurityEventTypes.SSO_LOGIN_FAILURE,
        ip,
        userAgent,
        { stage: 'callback', code, message },
        undefined,
        emailForAudit
      );
      if (emailForAudit) {
        await this.securityService.recordLoginAttempt(emailForAudit, ip, userAgent, false, message);
      }

      return this.redirectToLogin(reply, code);
    }
  };

  private redirectToLogin(reply: FastifyReply, code: SsoFailureCode) {
    return reply
      .clearCookie(SSO_FLOW_COOKIE, { path: '/' })
      .redirect(`${config.APP_URL}/login?sso_error=${encodeURIComponent(code)}`);
  }
}
