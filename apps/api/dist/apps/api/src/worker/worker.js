"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailPrompts = sendEmailPrompts;
exports.startWorker = startWorker;
const cron = __importStar(require("node-cron"));
const crypto_1 = require("crypto");
const date_fns_tz_1 = require("date-fns-tz");
const email_service_1 = require("../services/email.service");
const env_1 = require("../config/env");
// --- Helper Functions ---
/**
 * Calculates current date information based on the configured timezone.
 */
function getTodayDateInfo() {
    const timeZone = 'Europe/Paris'; // Could be moved to config
    const now = new Date();
    const zonedDate = (0, date_fns_tz_1.utcToZonedTime)(now, timeZone);
    const todayDateString = (0, date_fns_tz_1.format)(zonedDate, 'yyyy-MM-dd', { timeZone });
    return { zonedDate, todayDateString };
}
/**
 * Fetches holidays for the current date from the database.
 */
async function getHolidayData(fastify, dateString) {
    const { rows: holidaysToday } = await fastify.pg.query('SELECT country_code FROM holidays WHERE date = $1', [dateString]);
    const holidayCountries = new Set(holidaysToday.map(h => h.country_code));
    const isGlobalHoliday = holidayCountries.has(null);
    return { isGlobalHoliday, holidayCountries };
}
/**
 * Fetches all active users from the database.
 */
async function getActiveUsers(fastify) {
    const { rows: users } = await fastify.pg.query('SELECT * FROM users WHERE is_active = true');
    fastify.log.info(`Found ${users.length} active users.`);
    return users;
}
/**
 * Determines if an email should be sent to a specific user.
 */
function shouldSendEmailToUser(user, dateInfo, holidayData, fastify) {
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
async function generateAuthTokens(fastify, user, todayDateString, appUrl) {
    const actions = ['home', 'office'];
    const links = {};
    for (const action of actions) {
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration
        await fastify.pg.query("INSERT INTO email_cta_tokens (token, user_id, action, target_date, expires_at) VALUES ($1, $2, $3, $4, $5)", [token, user.user_id, action, todayDateString, expiresAt]);
        links[action] = `${appUrl}/cta?token=${token}`;
        fastify.log.info(`Generated token for ${user.email}, action ${action}`);
    }
    return links;
}
const email_templates_1 = require("../services/email-templates");
// ...
/**
 * Sends the daily prompt email to the user.
 */
async function sendDailyPromptEmail(fastify, user, links, todayDateString) {
    const subject = `Where are you working today? (${todayDateString})`;
    const text = `Hello ${user.first_name},\n\nPlease let us know where you are working today:\n\nHome: ${links['home']}\nOffice: ${links['office']}\n\nHave a great day!`;
    const html = (0, email_templates_1.generateEmailHtml)(`Where are you working today?`, user.first_name, `Please let us know your work location for today (${todayDateString}).`, [
        { label: 'Working from Home', url: links['home'], color: 'success' },
        { label: 'Working from Office', url: links['office'], color: 'info' }
    ]);
    await email_service_1.emailService.sendEmail(user.email, subject, text, html);
    fastify.log.info(`Sent email prompt to ${user.email}`);
}
// --- Main Worker Function ---
async function sendEmailPrompts(fastify) {
    fastify.log.info('Running daily email prompt worker...');
    const dateInfo = getTodayDateInfo();
    const holidayData = await getHolidayData(fastify, dateInfo.todayDateString);
    const users = await getActiveUsers(fastify);
    const appUrl = env_1.config.APP_URL;
    for (const user of users) {
        if (!shouldSendEmailToUser(user, dateInfo, holidayData, fastify)) {
            continue;
        }
        const links = await generateAuthTokens(fastify, user, dateInfo.todayDateString, appUrl);
        await sendDailyPromptEmail(fastify, user, links, dateInfo.todayDateString);
    }
}
function startWorker(fastify) {
    // Run daily at 08:00 CET/CEST.
    cron.schedule('0 8 * * *', () => sendEmailPrompts(fastify), {
        timezone: 'Europe/Paris',
    });
    fastify.log.info('Daily email prompt worker scheduled.');
}
