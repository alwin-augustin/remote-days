import { INotificationRepository, UserToNotify } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { randomUUID } from 'crypto';
import { config } from '../config/env';
import { generateEmailHtml } from './email-templates';

export class NotificationService {
  constructor(
    private notificationRepo: INotificationRepository,
    private emailService: EmailService
  ) { }

  async getDailyStats(date: string) {
    return this.notificationRepo.getDailyNotificationStats(date);
  }

  async sendDailyPromptToUser(user: UserToNotify, targetDate: string) {
    const actions = ['home', 'office'];
    const links: Record<string, string> = {};

    for (const action of actions) {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

      await this.notificationRepo.createEmailCTAToken(user.user_id, action, targetDate, expiresAt, token);
      links[action] = `${config.APP_URL}/cta?token=${token}`;
    }

    const subject = `Where are you working today? (${targetDate})`;

    // Plain text fallback
    const text = `Hello ${user.first_name},\n\nPlease let us know where you are working today (${targetDate}):\n\nHome: ${links['home']}\nOffice: ${links['office']}\n\nHave a great day!`;

    // Styled HTML
    const html = generateEmailHtml(
      'Daily Status Update',
      user.first_name,
      `<p>It's time to update your work status for <strong>${targetDate}</strong>.</p><p>Please select your location below to keep the team updated.</p>`,
      [
        { label: '🏠 Working from Home', url: links['home'], color: 'success' },
        { label: '🏢 Working from Office', url: links['office'], color: 'info' }
      ]
    );

    await this.emailService.sendEmail(user.email, subject, text, html);

    await this.notificationRepo.createNotification(
      user.user_id,
      'email',
      'daily_prompt',
      { targetDate, links }
    );
  }

  async resendDailyPrompts(date: string) {
    const usersToNotify = await this.notificationRepo.findUsersWithoutEntryForDate(date);
    for (const user of usersToNotify) {
      await this.sendDailyPromptToUser(user, date);
    }
    return { notifiedCount: usersToNotify.length };
  }
}
