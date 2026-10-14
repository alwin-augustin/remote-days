import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notification.service';
import { INotificationRepository } from '../../repositories/notification.repository';
import { EmailService } from '../email.service';
import { HolidayService } from '../holiday.service';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockNotificationRepo: INotificationRepository;
  let mockEmailService: EmailService;
  let mockHolidayService: HolidayService;

  beforeEach(() => {
    mockNotificationRepo = {
      getDailyNotificationStats: vi.fn(),
      createEmailCTAToken: vi.fn(),
      createNotification: vi.fn(),
      findUsersWithoutEntryForDate: vi.fn(),
      findNotificationsByDate: vi.fn(), // Added mock
    } as any;
    mockEmailService = {
      sendEmail: vi.fn(),
    } as any;
    mockHolidayService = {
      isHoliday: vi.fn().mockResolvedValue(false), // Default not holiday
    } as any;
    notificationService = new NotificationService(mockNotificationRepo, mockEmailService, mockHolidayService);
  });

  it('should send daily prompt to user', async () => {
    mockNotificationRepo.createEmailCTAToken = vi.fn().mockResolvedValue(true);
    mockEmailService.sendEmail = vi.fn().mockResolvedValue(true);
    mockNotificationRepo.createNotification = vi.fn().mockResolvedValue(true);

    const user = { user_id: '1', email: 'test@test.com', first_name: 'Test', work_country: 'FR' } as any;
    await notificationService.sendDailyPromptToUser(user, '2023-01-01');

    expect(mockHolidayService.isHoliday).toHaveBeenCalledWith('2023-01-01', 'FR');
    expect(mockNotificationRepo.createEmailCTAToken).toHaveBeenCalledTimes(2); // Home and Office
    expect(mockEmailService.sendEmail).toHaveBeenCalled();
    expect(mockNotificationRepo.createNotification).toHaveBeenCalled();
  });

  it('should skip sending prompt if holiday', async () => {
    (mockHolidayService.isHoliday as any).mockResolvedValue(true);
    const user = { user_id: '1', email: 'test@test.com', first_name: 'Test', work_country: 'FR' } as any;

    await notificationService.sendDailyPromptToUser(user, '2023-01-01');

    expect(mockHolidayService.isHoliday).toHaveBeenCalledWith('2023-01-01', 'FR');
    expect(mockNotificationRepo.createEmailCTAToken).not.toHaveBeenCalled();
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('should get notification logs', async () => {
    const mockLogs = [{ id: '1', type: 'email', event: 'daily_prompt' }];
    mockNotificationRepo.findNotificationsByDate = vi.fn().mockResolvedValue(mockLogs);

    const logs = await notificationService.getNotificationLogs('2023-01-01');

    expect(mockNotificationRepo.findNotificationsByDate).toHaveBeenCalledWith('2023-01-01');
    expect(logs).toEqual(mockLogs);
  });

  it('should get daily stats', async () => {
    const mockStats = { sent: 10, pending: 5 };
    mockNotificationRepo.getDailyNotificationStats = vi.fn().mockResolvedValue(mockStats);

    const stats = await notificationService.getDailyStats('2023-01-01');

    expect(mockNotificationRepo.getDailyNotificationStats).toHaveBeenCalledWith('2023-01-01');
    expect(stats).toEqual(mockStats);
  });
});
