import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import { IUserRepository } from '../repositories/user.repository';
import { ITokenRepository } from '../repositories/token.repository';
import { EmailService } from './email.service';
import { User, UserInfo } from '@tracker/types';
import { AppError } from '../errors/app-error';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { generateEmailHtml } from './email-templates';
import { IEntryRepository } from '../repositories/entry.repository';

interface ImportError {
  row: number;
  email?: string;
  error: string;
}

export class UserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: ITokenRepository,
    private readonly emailService: EmailService,
    private readonly entryRepo: IEntryRepository
  ) { }

  async createUser(data: Partial<User> & { temp_password?: string }): Promise<User> {
    if (!data.temp_password) {
      throw new AppError('Temporary password is required', 400);
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(data.temp_password, saltRounds);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { temp_password, ...userData } = data;

    return this.userRepo.create({
      ...userData,
      password_hash,
      role: data.role || 'employee',
      // Ensure mandatory fields are present or let repo validation handle it
    } as unknown as Omit<User, 'user_id' | 'created_at' | 'is_active'>);
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

  async importUsers(buffer: Buffer): Promise<{ total: number; inserted: number; errors: ImportError[] }> {
    // Changed parameter name and return type
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]; // Cast to strict record array

    let insertedCount = 0;
    const errors: ImportError[] = [];

    // Process sequentially to handle errors per row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +1 for header, +1 for 0-index

      if (!row.email || !row.first_name || !row.last_name || !row.country_of_residence || !row.work_country) {
        errors.push({ row: rowNum, error: 'Missing mandatory fields' });
        continue;
      }

      // Basic email validation
      if (!/^\S+@\S+\.\S+$/.test(row.email)) {
        errors.push({ row: rowNum, email: row.email, error: 'Invalid email format' });
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
          role: 'employee',
        });

        if (userId) {
          insertedCount++;

          // Trigger Activation Email
          await this.sendActivationEmail(userId, row.email, row.first_name);
        } else {
          errors.push({ row: rowNum, email: row.email, error: 'User already exists (skipped)' });
        }
      } catch (err: unknown) {
        // Safe error handling
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNum, email: row.email, error: errorMessage });
      }
    }

    return { total: records.length, inserted: insertedCount, errors };
  }

  private async sendActivationEmail(userId: string, email: string, firstName: string) {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration for activation

    await this.tokenRepo.create(token, userId, 'password-reset', expiresAt);

    const activationLink = `${config.APP_URL}/reset-password?token=${token}`;

    const emailHtml = generateEmailHtml(
      'Welcome to Remote Days',
      firstName,
      '<p>Your account has been created. To get started, please click the link below to verify your account and set your password.</p>',
      [{ label: 'Activate Account', url: activationLink, color: 'primary' }]
    );

    const emailText = `Hello ${firstName},\n\nWelcome to Remote Days! Please click the link below to activate your account and set your password:\n${activationLink}`;

    await this.emailService.sendEmail(email, 'Activate Your Account', emailText, emailHtml);
  }

  async exportUserData(userId: string): Promise<{ profile: UserInfo; exported_at: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // we currently only export profile, but planning to add entries later
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...safeUser } = user;
    return {
      profile: safeUser,
      exported_at: new Date().toISOString(),
    };
  }
}
