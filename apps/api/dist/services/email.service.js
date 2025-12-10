"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        // Use environment variables for configuration
        // If not present, it will likely fail or use a default if configured so.
        // For dev, we can print credentials if using Ethereal, but let's stick to env vars.
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendEmail(to, subject, text, html) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Teletravail Tracker" <no-reply@example.com>',
                to,
                subject,
                text,
                html: html || text,
            });
            console.log(`Message sent: ${info.messageId}`);
        }
        catch (error) {
            console.error('Error sending email:', error);
            // Don't throw, just log for now so the worker doesn't crash entirely
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
