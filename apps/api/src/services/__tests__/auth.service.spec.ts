import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../repositories/user.repository';
import { ITokenRepository } from '../../repositories/token.repository';
import { EmailService } from '../email.service';
import { AppError } from '../../errors/app-error';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

vi.mock('bcrypt');
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'fake-token'),
    verify: vi.fn(),
  },
  sign: vi.fn(() => 'fake-token'),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: IUserRepository;
  let mockTokenRepo: ITokenRepository;
  let mockEmailService: EmailService;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      countByRole: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    } as any;

    mockTokenRepo = {
      create: vi.fn(),
      findByToken: vi.fn(),
      markAsUsed: vi.fn(),
      deleteExpired: vi.fn(),
    } as any;

    mockEmailService = {
      sendEmail: vi.fn(),
    } as any;

    authService = new AuthService(mockUserRepo, mockTokenRepo, mockEmailService);
  });

  it('should login successfully with valid credentials', async () => {
    const mockUser = {
      user_id: '1',
      email: 'test@test.com',
      password_hash: 'hashed',
      role: 'employee',
      is_active: true,
    };
    mockUserRepo.findByEmail = vi.fn().mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('fake-token');

    const result = await authService.login('test@test.com', 'password');

    const { password_hash, ...expectedUser } = mockUser;
    expect(result.token).toBe('fake-token');
    expect(result.user).toEqual(expectedUser);
  });

  it('should throw error if user not found', async () => {
    mockUserRepo.findByEmail = vi.fn().mockResolvedValue(null);

    await expect(authService.login('wrong@test.com', 'password')).rejects.toThrow(AppError);
  });

  it('should throw error if password invalid', async () => {
    const mockUser = { user_id: '1', email: 'test@test.com', password_hash: 'hashed', is_active: true };
    mockUserRepo.findByEmail = vi.fn().mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(authService.login('test@test.com', 'wrongpassword')).rejects.toThrow(AppError);
  });
});
