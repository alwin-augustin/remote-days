import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestService } from './request.service';
import { IRequestRepository } from '../repositories/request.repository';
import { EntryService } from './entry.service';
import { IAuditRepository } from '../repositories/audit.repository';
import { IUserRepository } from '../repositories/user.repository';
import { EmailService } from './email.service';

describe('RequestService', () => {
  let requestService: RequestService;
  let requestRepo: IRequestRepository;
  let entryService: EntryService;
  let auditRepo: IAuditRepository;
  let userRepo: IUserRepository;
  let emailService: EmailService;

  beforeEach(() => {
    requestRepo = {
      create: vi.fn(),
      findByUser: vi.fn(),
      findAll: vi.fn(),
      findByStatus: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as any;

    entryService = {
      overrideEntry: vi.fn(),
    } as any;

    auditRepo = {
      log: vi.fn(),
    } as any;

    userRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
    } as any;

    emailService = {
      sendEmail: vi.fn().mockResolvedValue(true),
    } as any;

    requestService = new RequestService(requestRepo, entryService, auditRepo, userRepo, emailService);
  });

  describe('createRequest', () => {
    it('should create a request, log audit, and notify HR', async () => {
      const mockRequest = { id: 'req-1', user_id: 'u1', date: '2025-05-01', status: 'pending' };
      const mockUser = { user_id: 'u1', email: 'user@example.com', first_name: 'John', last_name: 'Doe' };
      const mockHR = { user_id: 'hr1', email: 'hr@example.com', role: 'hr' };

      (requestRepo.create as any).mockResolvedValue(mockRequest);
      (userRepo.findById as any).mockResolvedValue(mockUser);
      (userRepo.findAll as any).mockResolvedValue({ users: [mockHR], total: 1 });

      const result = await requestService.createRequest('u1', '2025-05-01', 'home' as any, 'Sick');

      expect(result).toEqual(mockRequest);
      expect(requestRepo.create).toHaveBeenCalled();

      // Verify HR Notification
      expect(userRepo.findAll).toHaveBeenCalledWith(50, 0, undefined, { role: 'hr' });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'hr@example.com',
        expect.stringContaining('New Request'),
        expect.stringContaining('John Doe'),
        expect.anything()
      );

      expect(auditRepo.log).toHaveBeenCalledWith(
        'CREATE',
        'u1',
        'u1',
        'Sick',
        'request',
        'req-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { requested_status: 'home', date: '2025-05-01', action: 'request_change' }
      );
    });
  });

  describe('processRequest', () => {
    it('should approve request, update entry, and notify user', async () => {
      const mockRequest = {
        id: 'req-1',
        user_id: 'u1',
        date: '2025-05-01',
        status: 'pending',
        requested_status: 'home',
        reason: 'Sick',
      };
      const mockUser = { user_id: 'u1', email: 'user@example.com', first_name: 'John' };
      const mockAdmin = { user_id: 'admin1', first_name: 'Admin' };

      (requestRepo.findById as any).mockResolvedValue(mockRequest);
      (requestRepo.updateStatus as any).mockResolvedValue({ ...mockRequest, status: 'approved' });
      (userRepo.findById as any).mockImplementation((id: string) => {
        if (id === 'u1') return Promise.resolve(mockUser);
        if (id === 'admin1') return Promise.resolve(mockAdmin);
        return Promise.resolve(null);
      });

      const result = await requestService.processRequest('req-1', 'approve', 'admin1');

      expect(requestRepo.updateStatus).toHaveBeenCalledWith('req-1', 'approved', 'admin1', undefined);
      expect(entryService.overrideEntry).toHaveBeenCalled();

      // Verify User Notification
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringContaining('APPROVED'),
        expect.stringContaining('approved by Admin'),
        expect.anything()
      );
    });

    it('should reject request without updating entry', async () => {
      const mockRequest = { id: 'req-1', user_id: 'u1', date: '2025-05-01', status: 'pending' };
      const mockUser = { user_id: 'u1', email: 'user@example.com' };

      (requestRepo.findById as any).mockResolvedValue(mockRequest);
      (requestRepo.updateStatus as any).mockResolvedValue({ ...mockRequest, status: 'rejected' });
      (userRepo.findById as any).mockResolvedValue(mockUser);

      await requestService.processRequest('req-1', 'reject', 'admin1', 'No');

      expect(requestRepo.updateStatus).toHaveBeenCalledWith('req-1', 'rejected', 'admin1', 'No');
      expect(entryService.overrideEntry).not.toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringContaining('REJECTED'),
        expect.anything(),
        expect.anything()
      );
    });
  });
});
