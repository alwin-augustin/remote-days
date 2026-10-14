import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntryService } from '../entry.service';
import { IEntryRepository } from '../../repositories/entry.repository';
import { AppError } from '../../errors/app-error';

describe('EntryService', () => {
  let entryService: EntryService;
  let mockEntryRepo: IEntryRepository;

  beforeEach(() => {
    mockEntryRepo = {
      upsert: vi.fn(),
      findByUserAndDate: vi.fn(),
      findByUserAndMonth: vi.fn(),
      findAllByUser: vi.fn(),
      getStatsForYear: vi.fn(),
      updateById: vi.fn(),
    };
    entryService = new EntryService(mockEntryRepo);
  });

  it('should create an entry if none exists', async () => {
    mockEntryRepo.findByUserAndDate = vi.fn().mockResolvedValue(null);
    mockEntryRepo.upsert = vi.fn().mockResolvedValue({ id: '1', status: 'home' });

    // The 4th argument is `allowOverwrite`, a boolean — only HR/admin may overwrite.
    const result = await entryService.createOrUpdateEntry('user1', '2023-01-01', 'home', false, 'user1');

    expect(mockEntryRepo.findByUserAndDate).toHaveBeenCalledWith('user1', '2023-01-01');
    expect(mockEntryRepo.upsert).toHaveBeenCalledWith('user1', '2023-01-01', 'home', 'web', 'user1');
    expect(result).toEqual({ id: '1', status: 'home' });
  });

  it('should throw error if employee tries to overwrite their own entry', async () => {
    mockEntryRepo.findByUserAndDate = vi.fn().mockResolvedValue({ id: '1', status: 'office' });

    await expect(entryService.createOrUpdateEntry('user1', '2023-01-01', 'home', false, 'user1')).rejects.toThrow(
      AppError
    );
  });

  it('should allow admin to overwrite an entry', async () => {
    mockEntryRepo.findByUserAndDate = vi.fn().mockResolvedValue({ id: '1', status: 'office' });
    mockEntryRepo.upsert = vi.fn().mockResolvedValue({ id: '1', status: 'home' });

    await entryService.createOrUpdateEntry('user1', '2023-01-01', 'home', true, 'admin1');

    expect(mockEntryRepo.upsert).toHaveBeenCalled();
  });
});
