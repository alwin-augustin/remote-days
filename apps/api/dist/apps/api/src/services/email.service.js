"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
class EmailService {
    constructor() {
        // Use environment variables for configuration
        // If not present, it will likely fail or use a default if configured so.
        // For dev, we can print credentials if using Ethereal, but let's stick to env vars.
        this.transporter = nodemailer_1.default.createTransport({
            host: env_1.config.SMTP_HOST || 'smtp.ethereal.email',
            port: env_1.config.SMTP_PORT || 587,
            secure: env_1.config.SMTP_SECURE,
            auth: {
                user: env_1.config.SMTP_USER,
                pass: env_1.config.SMTP_PASS,
            },
        });
    }
    async sendEmail(to, subject, text, html) {
        try {
            const info = await this.transporter.sendMail({
                from: env_1.config.SMTP_FROM || '"Teletravail Tracker" <no-reply@example.com>',
                to,
                subject,
                text,
                html: html || text,
            });
            // console.log(`Message sent: ${info.messageId}`);
        }
        catch (error) {
            console.error('Error sending email:', error);
            // Don't throw, just log for now so the worker doesn't crash entirely
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
