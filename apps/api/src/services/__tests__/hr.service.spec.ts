import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HRService } from '../hr.service';
import { IHRRepository } from '../../repositories/hr.repository';

describe('HRService', () => {
  let hrService: HRService;
  let mockHRRepo: IHRRepository;

  beforeEach(() => {
    mockHRRepo = {
      getEmployeeSummaries: vi.fn(),
      getEmployeeEntries: vi.fn(),
      updateEntry: vi.fn(),
      getDailyStats: vi.fn(),
      getDailyEntries: vi.fn(),
    } as any;
    hrService = new HRService(mockHRRepo);
  });

  it('should delegate getEmployeeSummaries', async () => {
    mockHRRepo.getEmployeeSummaries = vi.fn().mockResolvedValue([]);
    await hrService.getEmployeeSummaries();
    expect(mockHRRepo.getEmployeeSummaries).toHaveBeenCalled();
  });

  it('should delegate updateEntry', async () => {
    mockHRRepo.updateEntry = vi.fn().mockResolvedValue({ id: '1' });
    await hrService.updateEntry('1', 'office', 'reason', 'hr_id');
    expect(mockHRRepo.updateEntry).toHaveBeenCalledWith('1', 'office', 'reason', 'hr_id');
  });
});
