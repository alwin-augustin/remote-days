import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import { IUserRepository } from '../repositories/user.repository';
import { ITokenRepository } from '../repositories/token.repository';
import { EmailService } from './email.service';
import { User } from '@tracker/types'; // Added back
import { AppError } from '../errors/app-error';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { generateEmailHtml } from './email-templates';

export class UserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: ITokenRepository,
    private readonly emailService: EmailService
  ) { }

  async createUser(data: Partial<User> & { temp_password?: string }): Promise<User> {
    if (!data.temp_password) {
      throw new AppError('Temporary password is required', 400);
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(data.temp_password, saltRounds);

    return this.userRepo.create({
      ...data,
      password_hash,
      role: data.role || 'employee'
    } as any); // Cast to any if needed to match CreateUserDTO vs User entity
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async getUsers(limit: number, offset: number, search?: string, filters?: { role?: string; country?: string }) {
    return this.userRepo.findAll(limit, offset, search, filters);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    return this.userRepo.update(id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    return this.userRepo.softDelete(id);
  }

  async importUsers(buffer: Buffer): Promise<{ inserted: number; errors: any[] }> { // Changed parameter name and return type
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as any[]; // Cast to any[]


    let insertedCount = 0;
    const errors: any[] = [];

    // Process sequentially to handle errors per row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +1 for header, +1 for 0-index

      if (!row.email || !row.first_name || !row.last_name || !row.country_of_residence || !row.work_country) {
        errors.push({ row: rowNum, error: 'Missing mandatory fields' });
        continue;
      }

      // Generate random secure password (UUID) so "default password" attack is impossible
      const randomPassword = randomUUID();
      const hash = await bcrypt.hash(randomPassword, 10);

      try {
        const userId = await this.userRepo.createOrSkip({
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          country_of_residence: row.country_of_residence.toUpperCase(),
          work_country: row.work_country.toUpperCase(),
          password_hash: hash,
          role: 'employee'
        });

        if (userId) {
          insertedCount++;

          // Trigger Activation Email
          await this.sendActivationEmail(userId, row.email, row.first_name);
        } else {
          errors.push({ row: rowNum, email: row.email, error: 'User already exists (skipped)' });
        }
      } catch (err: any) {
        errors.push({ row: rowNum, email: row.email, error: err.message });
      }
    }

    return { inserted: insertedCount, errors };
  }

  private async sendActivationEmail(userId: string, email: string, firstName: string) {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration for activation

    await this.tokenRepo.create(token, userId, 'password-reset', expiresAt);

    const activationLink = `${config.APP_URL}/reset-password?token=${token}`;

    const emailHtml = generateEmailHtml(
      'Welcome to Teletravail Tracker',
      firstName,
      '<p>Your account has been created. To get started, please click the link below to verify your account and set your password.</p>',
      [
        { label: 'Activate Account', url: activationLink, color: 'primary' }
      ]
    );

    const emailText = `Hello ${firstName},\n\nWelcome to Teletravail Tracker! Please click the link below to activate your account and set your password:\n${activationLink}`;

    await this.emailService.sendEmail(email, 'Activate Your Account', emailText, emailHtml);
  }
}
