import { INotificationRepository, UserToNotify } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { HolidayService } from './holiday.service';
import { PushService } from './push.service';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { generateDailyCheckInEmail } from './email-templates';
import { format as formatDate } from 'date-fns';

export class NotificationService {
  private pushService: PushService | null = null;

  constructor(
    private notificationRepo: INotificationRepository,
    private emailService: EmailService,
    private holidayService: HolidayService
  ) {}

  setPushService(pushService: PushService) {
    this.pushService = pushService;
  }

  async getDailyStats(date: string) {
    return this.notificationRepo.getDailyNotificationStats(date);
  }

  async sendDailyPromptToUser(user: UserToNotify, targetDate: string) {
    const actions = ['home', 'office'];
    const links: Record<string, string> = {};

    // Check availability - skip holidays
    const isHoliday = await this.holidayService.isHoliday(targetDate, user.work_country);
    if (isHoliday) {
      return;
    }

    for (const action of actions) {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

      await this.notificationRepo.createEmailCTAToken(user.user_id, action, targetDate, expiresAt, token);
      links[action] = `${config.APP_URL}/cta?token=${token}`;
    }

    // Format date nicely for display (e.g., "Monday, December 30, 2024")
    const dateForDisplay = formatDate(new Date(targetDate), 'EEEE, MMMM d, yyyy');
    const shortDate = formatDate(new Date(targetDate), 'MMM d');

    const subject = `🏠 Where are you working today? · ${shortDate}`;

    // Plain text fallback
    const text = `Good morning ${user.first_name}!\n\nWhere are you working today (${dateForDisplay})?\n\n🏠 Home: ${links['home']}\n🏢 Office: ${links['office']}\n\nJust click one button — it takes 2 seconds!\n\n- Remote Days Team`;

    // Modern styled HTML
    const html = generateDailyCheckInEmail(user.first_name, dateForDisplay, links['home'], links['office']);

    await this.emailService.sendEmail(user.email, subject, text, html);

    // Also send push notification if available
    if (this.pushService) {
      try {
        await this.pushService.sendDailyReminder(user.user_id, targetDate);
      } catch (err) {
        // Log but don't fail - push is supplementary
        console.error('Failed to send push notification:', err);
      }
    }

    await this.notificationRepo.createNotification(user.user_id, 'email', 'daily_prompt', { targetDate, links });
  }

  async getNotificationLogs(date: string) {
    return this.notificationRepo.findNotificationsByDate(date);
  }
}
