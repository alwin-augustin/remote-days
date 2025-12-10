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

  async getUsers(limit: number, offset: number, search?: string) {
    return this.userRepo.findAll(limit, offset, search);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    return this.userRepo.update(id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    return this.userRepo.softDelete(id);
  }
}
