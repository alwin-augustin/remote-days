import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Use environment variables for configuration
    // If not present, it will likely fail or use a default if configured so.
    // For dev, we can print credentials if using Ethereal, but let's stick to env vars.
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.ethereal.email',
      port: config.SMTP_PORT || 587,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: config.SMTP_FROM || '"Teletravail Tracker" <no-reply@example.com>',
        to,
        subject,
        text,
        html: html || text,
      });
      // console.log(`Message sent: ${info.messageId}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw, just log for now so the worker doesn't crash entirely
    }
  }
}

export const emailService = new EmailService();
