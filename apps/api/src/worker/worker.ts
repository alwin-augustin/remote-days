import * as cron from 'node-cron';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import type { User } from '@remotedays/types';
import { utcToZonedTime, format } from 'date-fns-tz';
import { emailService } from '../services/email.service';
import { config } from '../config/env';

// --- Types ---

interface DateInfo {
  zonedDate: Date;
  todayDateString: string;
}

interface HolidayData {
  isGlobalHoliday: boolean;
  holidayCountries: Set<string>;
}

// --- Helper Functions ---

/**
 * Calculates current date information based on the configured timezone.
 */
function getTodayDateInfo(): DateInfo {
  const timeZone = 'Europe/Paris'; // Could be moved to config
  const now = new Date();
  const zonedDate = utcToZonedTime(now, timeZone);
  const todayDateString = format(zonedDate, 'yyyy-MM-dd', { timeZone });
  return { zonedDate, todayDateString };
}

/**
 * Fetches holidays for the current date from the database.
 */
async function getHolidayData(fastify: FastifyInstance, dateString: string): Promise<HolidayData> {
  const { rows: holidaysToday } = await fastify.pg.query('SELECT country_code FROM holidays WHERE date = $1', [
    dateString,
  ]);
  const holidayCountries = new Set(holidaysToday.map((h) => h.country_code));
  const isGlobalHoliday = holidayCountries.has(null);
  return { isGlobalHoliday, holidayCountries };
}

/**
 * Fetches all active users from the database.
 */
async function getActiveUsers(fastify: FastifyInstance): Promise<User[]> {
  const { rows: users } = await fastify.pg.query<User>('SELECT * FROM users WHERE is_active = true');
  fastify.log.info(`Found ${users.length} active users.`);
  return users;
}

/**
 * Fetches active users who haven't declared their status for a given date.
 */
async function getUsersWithoutEntry(fastify: FastifyInstance, dateString: string): Promise<User[]> {
  const { rows: users } = await fastify.pg.query<User>(
    `SELECT u.* FROM users u
     WHERE u.is_active = true
     AND NOT EXISTS (
       SELECT 1 FROM entries e
       WHERE e.user_id = u.user_id AND e.date = $1
     )`,
    [dateString]
  );
  fastify.log.info(`Found ${users.length} users without entries for ${dateString}.`);
  return users;
}

/**
 * Determines if an email should be sent to a specific user.
 */
function shouldSendEmailToUser(
  user: User,
  dateInfo: DateInfo,
  holidayData: HolidayData,
  fastify: FastifyInstance
): boolean {
  const dayOfWeek = dateInfo.zonedDate.getDay();

  // Skip weekends (Sunday=0, Saturday=6)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    fastify.log.info(`Skipping email for ${user.email} because it's a weekend.`);
    return false;
  }

  // Check for holidays
  if (holidayData.isGlobalHoliday || holidayData.holidayCountries.has(user.country_of_residence)) {
    fastify.log.info(`Skipping email for ${user.email} because it's a holiday.`);
    return false;
  }

  return true;
}

/**
 * Generates CTA tokens for home and office actions.
 */
async function generateAuthTokens(
  fastify: FastifyInstance,
  user: User,
  todayDateString: string,
  appUrl: string
): Promise<Record<string, string>> {
  const actions = ['home', 'office'];
  const links: Record<string, string> = {};

  for (const action of actions) {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

    await fastify.pg.query(
      'INSERT INTO email_cta_tokens (token, user_id, action, target_date, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [token, user.user_id, action, todayDateString, expiresAt]
    );
    // Encrypt email before putting in URL
    const encryptedEmail = encrypt(user.email);
    links[action] = `${appUrl}/cta?token=${token}&email=${encodeURIComponent(encryptedEmail)}`;
    fastify.log.info(`Generated token for ${user.email}, action ${action}`);
  }

  return links;
}

import { generateDailyCheckInEmail } from '../services/email-templates';
import { format as formatDate } from 'date-fns';
import { encrypt } from '../utils/crypto';

/**
 * Sends the daily prompt email to the user with the new modern design.
 */
async function sendDailyPromptEmail(
  fastify: FastifyInstance,
  user: User,
  links: Record<string, string>,
  todayDateString: string
): Promise<void> {
  // Format date nicely for display (e.g., "Monday, December 30, 2024")
  const dateForDisplay = formatDate(new Date(todayDateString), 'EEEE, MMMM d, yyyy');

  const subject = `🏠 Where are you working today? · ${formatDate(new Date(todayDateString), 'MMM d')}`;
  const text = `Good morning ${user.first_name}!\n\nWhere are you working today (${dateForDisplay})?\n\n🏠 Home: ${links['home']}\n🏢 Office: ${links['office']}\n\nJust click one button — it takes 2 seconds!\n\n- Remote Days Team`;

  const html = generateDailyCheckInEmail(user.first_name, dateForDisplay, links['home'], links['office']);

  await emailService.sendEmail(user.email, subject, text, html);
  fastify.log.info(`Sent daily check-in email to ${user.email}`);
}

// --- Main Worker Function ---

export interface SendEmailOptions {
  onlyPending?: boolean; // If true, only send to users who haven't declared yet
}

export interface SendEmailResult {
  totalUsers: number;
  sentCount: number;
  skippedCount: number;
  date: string;
}

export interface ProgressUpdate {
  total: number;
  sent: number;
  skipped: number;
  percent: number;
}

export async function sendEmailPrompts(
  fastify: FastifyInstance,
  options: SendEmailOptions = {},
  onProgress?: (update: ProgressUpdate) => void
): Promise<SendEmailResult> {
  const { onlyPending = false } = options;

  fastify.log.info(`Running daily email prompt worker (onlyPending: ${onlyPending})...`);

  const dateInfo = getTodayDateInfo();
  const holidayData = await getHolidayData(fastify, dateInfo.todayDateString);
  const appUrl = config.APP_URL;

  // Get users based on the option
  const users = onlyPending
    ? await getUsersWithoutEntry(fastify, dateInfo.todayDateString)
    : await getActiveUsers(fastify);

  // Apply Daily Email Limit if configured
  if (config.DAILY_EMAIL_LIMIT && users.length > config.DAILY_EMAIL_LIMIT) {
    fastify.log.warn(
      `Daily Email Limit applied: Reducing target users from ${users.length} to ${config.DAILY_EMAIL_LIMIT}`
    );
    // Truncate the array in place or reassign. Reassigning is safer here.
    users.splice(config.DAILY_EMAIL_LIMIT);
  }

  let sentCount = 0;
  let skippedCount = 0;
  const total = users.length;
  const batchSize = 10;

  // Initial progress report
  if (onProgress) {
    onProgress({ total, sent: 0, skipped: 0, percent: 0 });
  }

  // Process in batches
  for (let i = 0; i < total; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    // Process batch concurrently
    await Promise.all(
      batch.map(async (user) => {
        try {
          if (!shouldSendEmailToUser(user, dateInfo, holidayData, fastify)) {
            skippedCount++;
            return;
          }

          const links = await generateAuthTokens(fastify, user, dateInfo.todayDateString, appUrl);
          await sendDailyPromptEmail(fastify, user, links, dateInfo.todayDateString);
          sentCount++;
        } catch (err) {
          fastify.log.error(err, `Failed to send email to ${user.email}`);
          // Treat as skipped/failed but continue
          skippedCount++; // Or track errors separately if needed
        }
      })
    );

    // Update progress after batch
    const processed = Math.min(i + batchSize, total);
    if (onProgress) {
      onProgress({
        total,
        sent: sentCount,
        skipped: skippedCount,
        percent: Math.round((processed / total) * 100),
      });
    }

    // Optional small delay between batches to be nice to SMTP
    if (i + batchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  fastify.log.info(`Email worker completed: sent ${sentCount}, skipped ${skippedCount}`);

  return {
    totalUsers: total,
    sentCount,
    skippedCount,
    date: dateInfo.todayDateString,
  };
}

export function startWorker(fastify: FastifyInstance) {
  // Run daily at 08:00 CET/CEST.
  cron.schedule('0 8 * * *', () => sendEmailPrompts(fastify), {
    timezone: 'Europe/Paris',
  });
  fastify.log.info('Daily email prompt worker scheduled.');
}
