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

  it('should resend daily prompts for today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const users = [
      { user_id: '1', first_name: 'U1', work_country: 'FR' },
      { user_id: '2', first_name: 'U2', work_country: 'US' },
    ] as any[];
    mockNotificationRepo.findUsersWithoutEntryForDate = vi.fn().mockResolvedValue(users);

    await notificationService.resendDailyPrompts(today);

    expect(mockNotificationRepo.findUsersWithoutEntryForDate).toHaveBeenCalledWith(today);
    // Each user * 2 CTAs = 4 calls (assuming not holiday)
    expect(mockNotificationRepo.createEmailCTAToken).toHaveBeenCalledTimes(4);
  });

  it('should throw error if resend date is not today', async () => {
    const pastDate = '2020-01-01';
    await expect(notificationService.resendDailyPrompts(pastDate)).rejects.toThrow('Can only resend notifications for the current date.');
  });
});
