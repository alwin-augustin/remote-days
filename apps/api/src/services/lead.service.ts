import { EmailService } from './email.service';
import { CreateLeadType } from '../schemas/lead.schema';
import { config } from '../config/env';

export class LeadService {
  constructor(private emailService: EmailService) {}

  async submitLead(data: CreateLeadType) {
    const { email, message } = data;
    const adminEmail = config.SMTP_FROM || 'contact@remotedays.app'; // Fallback

    const subject = `New Lead: ${email}`;
    const text = `You have received a new contact request.\n\nEmail: ${email}\nMessage: ${message || 'No message provided'}`;
    const html = `
      <h3>New Contact Request</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message ? message.replace(/\n/g, '<br>') : 'No message provided'}</p>
    `;

    await this.emailService.sendEmail(adminEmail, subject, text, html);
    return { success: true };
  }
}
