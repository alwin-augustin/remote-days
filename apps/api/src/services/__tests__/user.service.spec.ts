import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user.service';
import { IUserRepository } from '../../repositories/user.repository';
import { AppError } from '../../errors/app-error';
import bcrypt from 'bcrypt';

vi.mock('bcrypt');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: IUserRepository;

  beforeEach(() => {
    mockUserRepo = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    } as any;
    userService = new UserService(mockUserRepo);
  });

  it('should create user with hashed password', async () => {
    (bcrypt.hash as any).mockResolvedValue('hashed_password');
    mockUserRepo.create = vi.fn().mockResolvedValue({ id: '1', email: 'test@test.com' });

    const result = await userService.createUser({ email: 'test@test.com', temp_password: 'pass' });

    expect(bcrypt.hash).toHaveBeenCalledWith('pass', 12);
    expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@test.com',
      password_hash: 'hashed_password'
    }));
    expect(result).toEqual({ id: '1', email: 'test@test.com' });
  });

  it('should throw error if temp field is missing', async () => {
    await expect(userService.createUser({ email: 'test@test.com' })).rejects.toThrow(AppError);
  });
});
