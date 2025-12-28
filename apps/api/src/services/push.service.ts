import { FastifyInstance } from 'fastify';

interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name: string | null;
  is_active: boolean;
}

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  categoryId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error: string };
}

export type NotificationType =
  | 'daily_reminder'
  | 'request_approved'
  | 'request_rejected'
  | 'threshold_warning'
  | 'threshold_exceeded';

export class PushService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly fastify: FastifyInstance) {}

  /**
   * Register a push token for a user
   */
  async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceName?: string
  ): Promise<void> {
    await this.fastify.pg.query(
      `INSERT INTO push_tokens (user_id, token, platform, device_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, token)
       DO UPDATE SET
         is_active = true,
         device_name = COALESCE($4, push_tokens.device_name),
         updated_at = now()`,
      [userId, token, platform, deviceName]
    );
  }

  /**
   * Unregister a push token (mark as inactive)
   */
  async unregisterToken(userId: string, token?: string): Promise<void> {
    if (token) {
      await this.fastify.pg.query(
        `UPDATE push_tokens SET is_active = false, updated_at = now()
         WHERE user_id = $1 AND token = $2`,
        [userId, token]
      );
    } else {
      // Deactivate all tokens for user (e.g., on logout from all devices)
      await this.fastify.pg.query(
        `UPDATE push_tokens SET is_active = false, updated_at = now()
         WHERE user_id = $1`,
        [userId]
      );
    }
  }

  /**
   * Get all active tokens for a user
   */
  async getActiveTokens(userId: string): Promise<PushToken[]> {
    const { rows } = await this.fastify.pg.query<PushToken>(
      `SELECT id, user_id, token, platform, device_name, is_active
       FROM push_tokens
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return rows;
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    notificationType: NotificationType,
    data?: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.getActiveTokens(userId);

    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: { ...data, type: notificationType },
      priority: 'high',
      channelId: this.getChannelId(notificationType),
    }));

    const results = await this.sendPushNotifications(messages);

    // Log the notification
    await this.logNotification(userId, notificationType, title, body, data, results);

    // Handle failed tokens (mark as inactive)
    await this.handleFailedTokens(tokens, results);

    const sent = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return { sent, failed };
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    notificationType: NotificationType,
    data?: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((userId) =>
          this.sendToUser(userId, title, body, notificationType, data)
        )
      );

      for (const result of results) {
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    }

    return { sent: totalSent, failed: totalFailed };
  }

  /**
   * Send daily reminder notification
   */
  async sendDailyReminder(userId: string, date: string): Promise<{ sent: number; failed: number }> {
    return this.sendToUser(
      userId,
      'Update Your Status',
      `Don't forget to log your work location for ${date}`,
      'daily_reminder',
      { date }
    );
  }

  /**
   * Send request approved notification
   */
  async sendRequestApproved(
    userId: string,
    date: string,
    adminNote?: string
  ): Promise<{ sent: number; failed: number }> {
    const body = adminNote
      ? `Your request for ${date} has been approved. Note: ${adminNote}`
      : `Your request for ${date} has been approved.`;

    return this.sendToUser(userId, 'Request Approved', body, 'request_approved', {
      date,
      adminNote,
    });
  }

  /**
   * Send request rejected notification
   */
  async sendRequestRejected(
    userId: string,
    date: string,
    adminNote?: string
  ): Promise<{ sent: number; failed: number }> {
    const body = adminNote
      ? `Your request for ${date} has been rejected. Reason: ${adminNote}`
      : `Your request for ${date} has been rejected.`;

    return this.sendToUser(userId, 'Request Rejected', body, 'request_rejected', {
      date,
      adminNote,
    });
  }

  /**
   * Send threshold warning notification
   */
  async sendThresholdWarning(
    userId: string,
    country: string,
    daysUsed: number,
    maxDays: number,
    percentage: number
  ): Promise<{ sent: number; failed: number }> {
    return this.sendToUser(
      userId,
      'Threshold Warning',
      `You've used ${daysUsed} of ${maxDays} days (${percentage}%) for ${country}`,
      'threshold_warning',
      { country, daysUsed, maxDays, percentage }
    );
  }

  /**
   * Send actual push notifications via Expo Push API
   */
  private async sendPushNotifications(
    messages: ExpoPushMessage[]
  ): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) {
      return [];
    }

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.fastify.log.error(`Expo Push API error: ${response.status}`);
        return messages.map(() => ({ status: 'error' as const, message: 'API error' }));
      }

      const result = await response.json();
      return result.data as ExpoPushTicket[];
    } catch (error) {
      this.fastify.log.error('Failed to send push notifications', error);
      return messages.map(() => ({ status: 'error' as const, message: 'Network error' }));
    }
  }

  /**
   * Handle failed tokens by marking them as inactive
   */
  private async handleFailedTokens(
    tokens: PushToken[],
    results: ExpoPushTicket[]
  ): Promise<void> {
    for (let i = 0; i < tokens.length; i++) {
      const ticket = results[i];
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        // Token is no longer valid, mark as inactive
        await this.fastify.pg.query(
          `UPDATE push_tokens SET is_active = false, updated_at = now()
           WHERE id = $1`,
          [tokens[i].id]
        );
        this.fastify.log.info(`Deactivated invalid push token for user ${tokens[i].user_id}`);
      }
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    userId: string,
    notificationType: NotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> | undefined,
    results: ExpoPushTicket[]
  ): Promise<void> {
    const hasSuccess = results.some((r) => r.status === 'ok');
    const status = hasSuccess ? 'sent' : 'failed';
    const errorMessage = hasSuccess
      ? null
      : results.find((r) => r.status === 'error')?.message || 'Unknown error';

    await this.fastify.pg.query(
      `INSERT INTO push_notification_logs
       (user_id, notification_type, title, body, data, status, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        notificationType,
        title,
        body,
        data ? JSON.stringify(data) : null,
        status,
        errorMessage,
        hasSuccess ? new Date() : null,
      ]
    );
  }

  /**
   * Get Android channel ID based on notification type
   */
  private getChannelId(type: NotificationType): string {
    switch (type) {
      case 'daily_reminder':
        return 'daily-status';
      case 'request_approved':
      case 'request_rejected':
        return 'requests';
      default:
        return 'default';
    }
  }
}
