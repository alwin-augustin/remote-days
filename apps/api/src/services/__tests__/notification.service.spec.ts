import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notification.service';
import { INotificationRepository } from '../../repositories/notification.repository';
import { EmailService } from '../email.service';

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockNotificationRepo: INotificationRepository;
    let mockEmailService: EmailService;

    beforeEach(() => {
        mockNotificationRepo = {
            getDailyNotificationStats: vi.fn(),
            createEmailCTAToken: vi.fn(),
            createNotification: vi.fn(),
            findUsersWithoutEntryForDate: vi.fn(),
        } as any;
        mockEmailService = {
            sendEmail: vi.fn(),
        } as any;
        notificationService = new NotificationService(mockNotificationRepo, mockEmailService);
    });

    it('should send daily prompt to user', async () => {
        mockNotificationRepo.createEmailCTAToken = vi.fn().mockResolvedValue(true);
        mockEmailService.sendEmail = vi.fn().mockResolvedValue(true);
        mockNotificationRepo.createNotification = vi.fn().mockResolvedValue(true);

        const user = { user_id: '1', email: 'test@test.com', first_name: 'Test' } as any;
        await notificationService.sendDailyPromptToUser(user, '2023-01-01');

        expect(mockNotificationRepo.createEmailCTAToken).toHaveBeenCalledTimes(2); // Home and Office
        expect(mockEmailService.sendEmail).toHaveBeenCalled();
        expect(mockNotificationRepo.createNotification).toHaveBeenCalled();
    });

    it('should resend daily prompts', async () => {
        const users = [{ user_id: '1', first_name: 'U1' }, { user_id: '2', first_name: 'U2' }] as any[];
        mockNotificationRepo.findUsersWithoutEntryForDate = vi.fn().mockResolvedValue(users);

        // Spy on internal method? Or just trust dependencies called.
        // sendDailyPromptToUser calls repo methods.

        await notificationService.resendDailyPrompts('2023-01-01');

        expect(mockNotificationRepo.findUsersWithoutEntryForDate).toHaveBeenCalledWith('2023-01-01');
        // Each user * 2 CTAs = 4 calls
        expect(mockNotificationRepo.createEmailCTAToken).toHaveBeenCalledTimes(4);
    });
});
