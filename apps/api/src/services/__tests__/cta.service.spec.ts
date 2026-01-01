import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CtaService } from '../cta.service';
import { ITokenRepository } from '../../repositories/token.repository';
import { IEntryRepository } from '../../repositories/entry.repository';
import { IUserRepository } from '../../repositories/user.repository';
import { AppError } from '../../errors/app-error';

describe('CtaService', () => {
  let ctaService: CtaService;
  let mockTokenRepo: ITokenRepository;
  let mockEntryRepo: IEntryRepository;
  let mockUserRepo: IUserRepository;

  beforeEach(() => {
    mockTokenRepo = {
      findByToken: vi.fn(),
      markAsUsed: vi.fn(),
    } as any;
    mockEntryRepo = {
      upsert: vi.fn(),
    } as any;
    mockUserRepo = {
      findById: vi.fn(),
    } as any;
    ctaService = new CtaService(mockTokenRepo, mockEntryRepo, mockUserRepo);
  });

  it('should record status from valid token', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const mockToken = {
      token: 'valid',
      user_id: '1',
      action: 'home',
      target_date: '2023-01-01',
      expires_at: futureDate,
      used: false,
    };
    mockTokenRepo.findByToken = vi.fn().mockResolvedValue(mockToken);

    await ctaService.recordStatusFromToken('valid');

    expect(mockEntryRepo.upsert).toHaveBeenCalledWith('1', '2023-01-01', 'home', 'email_link', '1');
    expect(mockTokenRepo.markAsUsed).toHaveBeenCalledWith('valid');
  });

  it('should throw if token expired', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const mockToken = {
      token: 'expired',
      expires_at: pastDate,
      used: false,
      target_date: '2023-01-01',
    };
    mockTokenRepo.findByToken = vi.fn().mockResolvedValue(mockToken);

    await expect(ctaService.recordStatusFromToken('expired')).rejects.toThrow(AppError);
  });

  it('should throw if token already used', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const mockToken = {
      token: 'used',
      expires_at: futureDate,
      used: true,
      target_date: '2023-01-01',
    };
    mockTokenRepo.findByToken = vi.fn().mockResolvedValue(mockToken);

    await expect(ctaService.recordStatusFromToken('used')).rejects.toThrow(AppError);
  });
});
