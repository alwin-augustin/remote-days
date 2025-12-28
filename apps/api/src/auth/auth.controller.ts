import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { User } from '@remotedays/types';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { SecurityService, SecurityEventTypes } from '../services/security.service';
import { config } from '../config/env';
import { AppError } from '../errors/app-error';

export class AuthController {
  private securityService: SecurityService | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  // Initialize security service (called after fastify instance is available)
  initSecurityService(fastify: FastifyInstance) {
    this.securityService = new SecurityService(fastify);
  }

  private getClientInfo(request: FastifyRequest) {
    return {
      ip: request.ip || (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
    };
  }

  loginHandler = async (
    request: FastifyRequest<{ Body: Pick<User, 'email'> & { password: string } }>,
    reply: FastifyReply
  ) => {
    const { email, password } = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    // Check if account is locked
    if (this.securityService) {
      const lockStatus = await this.securityService.isAccountLocked(email);
      if (lockStatus.locked) {
        await this.securityService.logSecurityEvent(
          SecurityEventTypes.LOGIN_LOCKOUT,
          ip,
          userAgent,
          { email, remainingMinutes: lockStatus.remainingMinutes },
          undefined,
          email
        );

        throw new AppError(
          `Account temporarily locked. Please try again in ${lockStatus.remainingMinutes} minutes.`,
          423 // Locked status code
        );
      }
    }

    try {
      const { token, user } = await this.authService.login(email, password);

      // Record successful login
      if (this.securityService) {
        await this.securityService.recordLoginAttempt(email, ip, userAgent, true);
        await this.securityService.clearLoginAttempts(email);
        await this.securityService.logSecurityEvent(
          SecurityEventTypes.LOGIN_SUCCESS,
          ip,
          userAgent,
          { userId: user.user_id },
          user.user_id,
          email
        );
      }

      reply
        .setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax', // Must be 'none' for cross-site (Vercel -> EC2)
        })
        .code(200)
        .send({ message: 'Login successful', token, user });
    } catch (error) {
      // Record failed login attempt
      if (this.securityService) {
        const failureReason = error instanceof AppError ? error.message : 'Unknown error';
        await this.securityService.recordLoginAttempt(email, ip, userAgent, false, failureReason);

        const failedCount = await this.securityService.getFailedAttemptCount(email);
        await this.securityService.logSecurityEvent(
          SecurityEventTypes.LOGIN_FAILURE,
          ip,
          userAgent,
          { email, failedAttempts: failedCount, reason: failureReason },
          undefined,
          email
        );
      }

      throw error;
    }
  };

  logoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token').code(204).send();
  };

  getMeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send(request.user);
  };

  passwordResetRequestHandler = async (request: FastifyRequest<{ Body: Pick<User, 'email'> }>, reply: FastifyReply) => {
    const { email } = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await this.authService.requestPasswordReset(email);

    // Log security event
    if (this.securityService) {
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.PASSWORD_RESET_REQUEST,
        ip,
        userAgent,
        { email },
        undefined,
        email
      );
    }

    // Always return a success message to prevent email enumeration
    reply.code(200).send({ message: 'If a user with that email exists, a password reset link has been sent.' });
  };

  passwordResetHandler = async (
    request: FastifyRequest<{ Body: { token: string; password?: string } }>,
    reply: FastifyReply
  ) => {
    const { token, password } = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    await this.authService.resetPassword(token, password);

    // Log security event
    if (this.securityService) {
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.PASSWORD_RESET_SUCCESS,
        ip,
        userAgent,
        { tokenUsed: token.substring(0, 8) + '...' }
      );
    }

    reply.code(200).send({ message: 'Password has been reset' });
  };

  // GDPR: Right to Data Portability
  exportDataHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { ip, userAgent } = this.getClientInfo(request);

    const data = await this.userService.exportUserData(user.user_id);

    // Log security event
    if (this.securityService) {
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.DATA_EXPORTED,
        ip,
        userAgent,
        {},
        user.user_id,
        user.email
      );
    }

    reply.header('Content-Disposition', `attachment; filename="user-${user.user_id}.json"`);
    reply.send(data);
  };

  // GDPR: Right to Erasure
  deleteAccountHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { ip, userAgent } = this.getClientInfo(request);

    await this.userService.deleteUser(user.user_id);

    // Log security event
    if (this.securityService) {
      await this.securityService.logSecurityEvent(
        SecurityEventTypes.ACCOUNT_DELETED,
        ip,
        userAgent,
        { deletedUserId: user.user_id },
        undefined,
        user.email
      );
    }

    // Logout after delete
    reply.clearCookie('token').code(204).send();
  };
}
