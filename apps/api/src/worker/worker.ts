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
    links[action] = `${appUrl}/cta?token=${token}`;
    fastify.log.info(`Generated token for ${user.email}, action ${action}`);
  }

  return links;
}

import { generateEmailHtml } from '../services/email-templates';

// ...

/**
 * Sends the daily prompt email to the user.
 */
async function sendDailyPromptEmail(
  fastify: FastifyInstance,
  user: User,
  links: Record<string, string>,
  todayDateString: string
): Promise<void> {
  const subject = `Where are you working today? (${todayDateString})`;
  const text = `Hello ${user.first_name},\n\nPlease let us know where you are working today:\n\nHome: ${links['home']}\nOffice: ${links['office']}\n\nHave a great day!`;

  const html = generateEmailHtml(
    `Where are you working today?`,
    user.first_name,
    `Please let us know your work location for today (${todayDateString}).`,
    [
      { label: 'Working from Home', url: links['home'], color: 'success' },
      { label: 'Working from Office', url: links['office'], color: 'info' },
    ]
  );

  await emailService.sendEmail(user.email, subject, text, html);
  fastify.log.info(`Sent email prompt to ${user.email}`);
}

// --- Main Worker Function ---

export async function sendEmailPrompts(fastify: FastifyInstance) {
  fastify.log.info('Running daily email prompt worker...');

  const dateInfo = getTodayDateInfo();
  const holidayData = await getHolidayData(fastify, dateInfo.todayDateString);
  const users = await getActiveUsers(fastify);
  const appUrl = config.APP_URL;

  for (const user of users) {
    if (!shouldSendEmailToUser(user, dateInfo, holidayData, fastify)) {
      continue;
    }

    const links = await generateAuthTokens(fastify, user, dateInfo.todayDateString, appUrl);
    await sendDailyPromptEmail(fastify, user, links, dateInfo.todayDateString);
  }
}

export function startWorker(fastify: FastifyInstance) {
  // Run daily at 08:00 CET/CEST.
  cron.schedule('0 8 * * *', () => sendEmailPrompts(fastify), {
    timezone: 'Europe/Paris',
  });
  fastify.log.info('Daily email prompt worker scheduled.');
}
