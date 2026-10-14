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
      getDailyStats: vi.fn(),
      getDailyEntries: vi.fn(),
      getRiskStats: vi.fn(),
    } as any;
    hrService = new HRService(mockHRRepo);
  });

  it('should delegate getEmployeeSummaries', async () => {
    mockHRRepo.getEmployeeSummaries = vi.fn().mockResolvedValue([]);
    await hrService.getEmployeeSummaries();
    expect(mockHRRepo.getEmployeeSummaries).toHaveBeenCalled();
  });
});
