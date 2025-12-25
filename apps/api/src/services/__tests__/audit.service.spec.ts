import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../audit.service';
import { IAuditRepository } from '../../repositories/audit.repository';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockAuditRepo: IAuditRepository;

  beforeEach(() => {
    mockAuditRepo = {
      getAuditLogs: vi.fn(),
      log: vi.fn(),
    } as any;
    auditService = new AuditService(mockAuditRepo);
  });

  it('should get audit logs', async () => {
    const mockLogs = [{ id: 1, action: 'login' }];
    mockAuditRepo.getAuditLogs = vi.fn().mockResolvedValue(mockLogs);

    const result = await auditService.getAuditReport('2023-01-01', '2023-01-02');
    expect(result).toEqual(mockLogs);
    expect(mockAuditRepo.getAuditLogs).toHaveBeenCalledWith('2023-01-01', '2023-01-02', undefined);
  });

  it('should generate excel buffer', async () => {
    const mockLogs = [{ created_at: new Date(), action: 'login', actor_email: 'a@a.com', details: { ip: '1.2.3.4' } }];
    mockAuditRepo.getAuditLogs = vi.fn().mockResolvedValue(mockLogs);

    const buffer = await auditService.generateAuditExcel();

    // ExcelJS writeBuffer returns a Promise<Buffer>
    expect(buffer).toBeDefined();
    // Simple check that it's likely a buffer (in mock environment might be tricky if ExcelJS not mocked, but real ExcelJS works in Node)
  });
});
