import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@remotedays/types';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { SecurityService, SecurityEventTypes } from '../services/security.service';
import { config } from '../config/env';
import { AppError } from '../errors/app-error';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly securityService: SecurityService
  ) {}

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
        423
      );
    }

    try {
      const { token, user } = await this.authService.login(email, password);

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

      return reply
        .setCookie('token', token, {
          path: '/',
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
        })
        .code(200)
        .send({ message: 'Login successful', user });
    } catch (error) {
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

      throw error;
    }
  };

  logoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.clearCookie('token').code(204).send();
  };

  getMeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.userService.findByEmail(request.user.email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return reply.send(user);
  };

  passwordResetRequestHandler = async (request: FastifyRequest<{ Body: Pick<User, 'email'> }>, reply: FastifyReply) => {
    const { email } = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    await this.authService.requestPasswordReset(email);

    await this.securityService.logSecurityEvent(
      SecurityEventTypes.PASSWORD_RESET_REQUEST,
      ip,
      userAgent,
      { email },
      undefined,
      email
    );

    // Always return a success message to prevent email enumeration
    return reply.code(200).send({ message: 'If a user with that email exists, a password reset link has been sent.' });
  };

  passwordResetHandler = async (
    request: FastifyRequest<{ Body: { token: string; password?: string } }>,
    reply: FastifyReply
  ) => {
    const { token, password } = request.body;
    const { ip, userAgent } = this.getClientInfo(request);

    await this.authService.resetPassword(token, password);

    await this.securityService.logSecurityEvent(SecurityEventTypes.PASSWORD_RESET_SUCCESS, ip, userAgent, {
      tokenUsed: token.substring(0, 8) + '...',
    });

    return reply.code(200).send({ message: 'Password has been reset' });
  };

  // GDPR: Right to Data Portability
  exportDataHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { ip, userAgent } = this.getClientInfo(request);

    const data = await this.userService.exportUserData(user.user_id);

    await this.securityService.logSecurityEvent(
      SecurityEventTypes.DATA_EXPORTED,
      ip,
      userAgent,
      {},
      user.user_id,
      user.email
    );

    reply.header('Content-Disposition', `attachment; filename="user-${user.user_id}.json"`);
    return reply.send(data);
  };

  // GDPR: Right to Erasure
  deleteAccountHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { ip, userAgent } = this.getClientInfo(request);

    await this.userService.deleteUser(user.user_id);

    await this.securityService.logSecurityEvent(
      SecurityEventTypes.ACCOUNT_DELETED,
      ip,
      userAgent,
      { deletedUserId: user.user_id },
      undefined,
      user.email
    );

    // Logout after delete
    return reply.clearCookie('token').code(204).send();
  };
}
