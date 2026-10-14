import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error';
import { SsoService } from '../services/sso.service';
import { SecurityService, SecurityEventTypes } from '../services/security.service';
import { SsoSettingsBodyType, SsoTestBodyType, SsoIdentityParamsType } from '../schemas';

/**
 * Admin-only SSO configuration. Configuration is a deployment-level, security
 * sensitive action, so every route here requires the `admin` role — unlike user
 * and country management, which HR may also perform.
 */
export class SsoAdminController {
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

  getSettingsHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
    const settings = await this.ssoService.getAdminSettings();
    // `null` simply means SSO has never been configured on this deployment.
    return reply.send({ settings });
  };

  updateSettingsHandler = async (
    request: FastifyRequest<{ Body: SsoSettingsBodyType }>,
    reply: FastifyReply
  ) => {
    const body = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    const secret = await this.resolveSecret(body.clientSecret);

    const settings = await this.ssoService.updateSettings({
      display_name: body.displayName,
      issuer: body.issuer.replace(/\/$/, ''),
      tenant_id: body.tenantId ?? null,
      client_id: body.clientId,
      client_secret_encrypted: secret,
      scopes: body.scopes ?? 'openid profile email',
      allowed_email_domains: (body.allowedEmailDomains ?? []).map((d) => d.trim().toLowerCase()).filter(Boolean),
      auto_link_by_email: body.autoLinkByEmail ?? true,
      is_enabled: body.isEnabled,
    });

    await this.securityService.logSecurityEvent(
      SecurityEventTypes.SSO_SETTINGS_CHANGED,
      ip,
      userAgent,
      {
        issuer: settings.issuer,
        isEnabled: settings.isEnabled,
        autoLinkByEmail: settings.autoLinkByEmail,
        allowedEmailDomains: settings.allowedEmailDomains,
        // Never log the secret itself, only whether one is stored.
        secretChanged: body.clientSecret !== undefined,
      },
      request.user?.user_id,
      request.user?.email
    );

    return reply.send({ settings });
  };

  testConnectionHandler = async (request: FastifyRequest<{ Body: SsoTestBodyType }>, reply: FastifyReply) => {
    const result = await this.ssoService.testConnection({ issuer: request.body.issuer.replace(/\/$/, '') });
    return reply.code(result.ok ? 200 : 502).send(result);
  };

  listIdentitiesHandler = async (
    request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>,
    reply: FastifyReply
  ) => {
    const limit = Math.min(Number(request.query?.limit ?? 50) || 50, 200);
    const offset = Number(request.query?.offset ?? 0) || 0;
    const identities = await this.ssoService.listIdentities(limit, offset);
    return reply.send({ identities });
  };

  unlinkIdentityHandler = async (
    request: FastifyRequest<{ Params: SsoIdentityParamsType }>,
    reply: FastifyReply
  ) => {
    const { ip, userAgent } = this.getClientInfo(request);
    const removed = await this.ssoService.unlinkIdentity(request.params.userId);

    if (!removed) {
      throw new AppError('No SSO identity is linked to that user.', 404);
    }

    await this.securityService.logSecurityEvent(
      SecurityEventTypes.SSO_IDENTITY_UNLINKED,
      ip,
      userAgent,
      { targetUserId: request.params.userId },
      request.user?.user_id,
      request.user?.email
    );

    return reply.code(204).send();
  };

  /**
   * Maps the tri-state `clientSecret` field from the request onto the
   * repository's contract: undefined = keep, null = clear, string = replace
   * (encrypted at rest).
   */
  private async resolveSecret(input: string | null | undefined): Promise<string | null | undefined> {
    if (input === undefined) return undefined;
    if (input === null || input.trim() === '') return null;
    return SsoService.encryptSecret(input.trim());
  }
}
