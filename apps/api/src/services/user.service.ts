import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../repositories/user.repository';
import { User } from '@tracker/types';
import { AppError } from '../errors/app-error';

export class UserService {
  constructor(private userRepo: IUserRepository) { }

  async createUser(data: Partial<User> & { temp_password?: string }): Promise<User> {
    if (!data.temp_password) {
      throw new AppError('Temporary password is required', 400);
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(data.temp_password, saltRounds);

    return this.userRepo.create({
      ...data,
      password_hash,
    });
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

  async importUsers(fileBuffer: Buffer): Promise<{ total: number; inserted: number; errors: any[] }> {
    const { parse } = await import('csv-parse'); // Dynamic import or top level

    const results: any[] = [];
    const errors: any[] = [];
    let insertedCount = 0;

    const parser = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for await (const record of parser) {
      results.push(record);
    }

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2;

      if (!row.email || !row.first_name || !row.last_name || !row.country_of_residence || !row.work_country) {
        errors.push({ row: rowNum, error: 'Missing mandatory fields' });
        continue;
      }

      const hash = await bcrypt.hash('changeMe123!', 10);

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
        } else {
          errors.push({ row: rowNum, email: row.email, error: 'User already exists (skipped)' });
        }
      } catch (err: any) {
        errors.push({ row: rowNum, email: row.email, error: err.message });
      }
    }

    return {
      total: results.length,
      inserted: insertedCount,
      errors
    };
  }
}
