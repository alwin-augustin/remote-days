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
exports.startWorker = startWorker;
const cron = __importStar(require("node-cron"));
const crypto_1 = require("crypto");
const date_fns_tz_1 = require("date-fns-tz");
const email_service_1 = require("../services/email.service");
async function sendEmailPrompts(fastify) {
    fastify.log.info('Running daily email prompt worker...');
    const timeZone = 'Europe/Paris';
    const now = new Date();
    const zonedDate = (0, date_fns_tz_1.utcToZonedTime)(now, timeZone);
    const todayDateString = (0, date_fns_tz_1.format)(zonedDate, 'yyyy-MM-dd', { timeZone });
    // 1. Fetch all today's holidays
    const { rows: holidaysToday } = await fastify.pg.query('SELECT country_code FROM holidays WHERE date = $1', [todayDateString]);
    const holidayCountries = new Set(holidaysToday.map(h => h.country_code));
    const isGlobalHoliday = holidayCountries.has(null);
    const { rows: users } = await fastify.pg.query('SELECT * FROM users WHERE is_active = true');
    fastify.log.info(`Found ${users.length} active users.`);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    for (const user of users) {
        const dayOfWeek = zonedDate.getDay();
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            fastify.log.info(`Skipping email for ${user.email} because it's a weekend.`);
            continue;
        }
        // Check for holidays
        if (isGlobalHoliday || holidayCountries.has(user.country_of_residence)) {
            fastify.log.info(`Skipping email for ${user.email} because it's a holiday.`);
            continue;
        }
        // Generate CTA tokens
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
        // Send Email
        const subject = `Where are you working today? (${todayDateString})`;
        const text = `Hello ${user.first_name},\n\nPlease let us know where you are working today:\n\nHome: ${links['home']}\nOffice: ${links['office']}\n\nHave a great day!`;
        const html = `
      <p>Hello ${user.first_name},</p>
      <p>Please let us know where you are working today:</p>
      <p>
        <a href="${links['home']}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Working from Home</a>
        <br><br>
        <a href="${links['office']}" style="padding: 10px 20px; background-color: #008CBA; color: white; text-decoration: none; border-radius: 5px;">Working from Office</a>
      </p>
      <p>Have a great day!</p>
    `;
        await email_service_1.emailService.sendEmail(user.email, subject, text, html);
        fastify.log.info(`Sent email prompt to ${user.email}`);
    }
}
function startWorker(fastify) {
    // Run daily at 08:00 CET/CEST.
    cron.schedule('0 8 * * *', () => sendEmailPrompts(fastify), {
        timezone: 'Europe/Paris',
    });
    fastify.log.info('Daily email prompt worker scheduled.');
}
