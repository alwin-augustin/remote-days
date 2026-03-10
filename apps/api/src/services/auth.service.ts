import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IUserRepository } from '../repositories/user.repository';
import { ITokenRepository } from '../repositories/token.repository';
import { EmailService } from './email.service';
import { config } from '../config/env';
import { AppError } from '../errors/app-error';
import { UserInfo } from '@remotedays/types';
import { generateEmailHtml } from './email-templates';

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: ITokenRepository,
    private readonly emailService: EmailService
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Use generic error for security
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.password_hash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError('User account is inactive', 403);
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRATION } as jwt.SignOptions
    );

    // Return user info (except password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userInfo } = user;
    return { token, user: userInfo };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.is_active) {
      // Return cleanly to avoid enumeration
      return;
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    await this.tokenRepo.create(token, user.user_id, 'password-reset', expiresAt);

    const resetLink = `${config.APP_URL}/reset-password?token=${token}`;
    const emailText = `Hello ${user.first_name},\n\nPlease click the link below to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`;

    const emailHtml = generateEmailHtml(
      'Reset Your Password',
      user.first_name,
      '<p>We received a request to reset your password. Use the link below to set up a new one.</p><p>If you did not request this, you can safely ignore this email.</p>',
      [{ label: 'Reset Password', url: resetLink, color: 'primary' }]
    );

    await this.emailService.sendEmail(user.email, 'Password Reset Request', emailText, emailHtml);
  }

  async resetPassword(token: string, newPassword?: string): Promise<void> {
    if (!token || !newPassword) {
      throw new AppError('Token and password are required', 400);
    }

    const tokenData = await this.tokenRepo.findByTokenAndAction(token, 'password-reset');
    if (!tokenData) {
      throw new AppError('Invalid token', 400);
    }

    if (tokenData.used) {
      throw new AppError('Token has already been used', 400);
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      throw new AppError('Token has expired', 400);
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepo.updatePassword(tokenData.user_id, hashedPassword);
    await this.tokenRepo.markAsUsed(token);
  }
}
