import { Pool } from 'pg';

export interface Notification {
  id: string;
  user_id: string;
  channel: string;
  notification_type: string;
  payload: object;
  sent_at: Date;
}

export interface EmailCTAToken {
  token: string;
  user_id: string;
  action: string;
  target_date: Date;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface NotificationStats {
  total_active_users_notified: string;
  total_sent_prompts: string;
  total_users_responded: string;
  total_cta_used: string;
  users_without_entry: string;
}

export interface UserToNotify {
  user_id: string;
  email: string;
  first_name: string;
  country_of_residence: string;
  work_country: string;
}

export interface INotificationRepository {
  getDailyNotificationStats(date: string): Promise<NotificationStats>;
  findUsersWithoutEntryForDate(date: string): Promise<UserToNotify[]>;
  createEmailCTAToken(
    userId: string,
    action: string,
    targetDate: string,
    expiresAt: Date,
    token: string
  ): Promise<EmailCTAToken>;
  createNotification(userId: string, channel: string, notificationType: string, payload: object): Promise<Notification>;
  findNotificationsByDate(date: string): Promise<{ id: string, sent_at: Date, user_first_name: string, user_last_name: string, user_email: string, notification_type: string }[]>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private pool: Pool) { }

  async getDailyNotificationStats(date: string): Promise<NotificationStats> {
    const { rows } = await this.pool.query<NotificationStats>(
      `SELECT
        (SELECT COUNT(user_id) FROM users WHERE is_active = TRUE) AS total_active_users_notified,
        (SELECT COUNT(id) FROM notifications WHERE DATE(sent_at) = $1::date AND notification_type = 'daily_prompt') AS total_sent_prompts,
        (SELECT COUNT(DISTINCT user_id) FROM email_cta_tokens WHERE target_date = $1::date AND action IN ('home', 'office') AND used = TRUE) AS total_users_responded,
        (SELECT COUNT(token) FROM email_cta_tokens WHERE target_date = $1::date AND action IN ('home', 'office') AND used = TRUE) AS total_cta_used,
        (SELECT COUNT(user_id) FROM users u WHERE u.is_active = TRUE AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.user_id = u.user_id AND e.date = $1::date)) AS users_without_entry
      ;`,
      [date]
    );
    return rows[0];
  }

  async findUsersWithoutEntryForDate(date: string): Promise<UserToNotify[]> {
    const { rows } = await this.pool.query<UserToNotify>(
      `SELECT
        u.user_id, u.email, u.first_name, u.country_of_residence, u.work_country
       FROM users u
       WHERE u.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM entries e
         WHERE e.user_id = u.user_id AND e.date = $1
       );`,
      [date]
    );
    return rows;
  }

  async createEmailCTAToken(
    userId: string,
    action: string,
    targetDate: string,
    expiresAt: Date,
    token: string
  ): Promise<EmailCTAToken> {
    const { rows } = await this.pool.query<EmailCTAToken>(
      `INSERT INTO email_cta_tokens (token, user_id, action, target_date, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [token, userId, action, targetDate, expiresAt]
    );
    return rows[0];
  }

  async createNotification(
    userId: string,
    channel: string,
    notificationType: string,
    payload: object
  ): Promise<Notification> {
    const { rows } = await this.pool.query<Notification>(
      `INSERT INTO notifications (user_id, channel, notification_type, payload)
       VALUES ($1, $2, $3, $4) RETURNING *;`,
      [userId, channel, notificationType, payload]
    );
    return rows[0];
    return rows[0];
  }

  async findNotificationsByDate(date: string): Promise<{ id: string, sent_at: Date, user_first_name: string, user_last_name: string, user_email: string, notification_type: string }[]> {
    const { rows } = await this.pool.query<{ id: string, sent_at: Date, user_first_name: string, user_last_name: string, user_email: string, notification_type: string }>(
      `SELECT n.id, n.sent_at, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email, n.notification_type
       FROM notifications n
       JOIN users u ON n.user_id = u.user_id
       WHERE DATE(n.sent_at) = $1::date
       ORDER BY n.sent_at DESC`,
      [date]
    );
    return rows;
  }
}
