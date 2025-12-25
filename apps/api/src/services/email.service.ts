import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
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
      const result = await this.transporter.sendMail({
        from: config.SMTP_FROM || '"Remote Days" <no-reply@remotedays.app>',
        to,
        subject,
        text,
        html: html || text,
      });
      return result;
    } catch (error) {
      // Log the error with context for monitoring
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send email to ${to}: ${errorMessage}`);
    }
  }
}
