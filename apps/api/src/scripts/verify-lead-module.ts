import { LeadService } from '../services/lead.service';
import { EmailService } from '../services/email.service';
import { config } from '../config/env';

async function verify() {
  console.log('Starting Lead Module Verification...');
  console.log('Configured SMTP_FROM:', config.SMTP_FROM);

  if (!config.SMTP_HOST) {
    console.error('SMTP_HOST is not defined. Skipping email test.');
    return;
  }

  console.log('SMTP Config:', {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    user: config.SMTP_USER ? '***' : undefined,
  });

  const emailService = new EmailService();
  const leadService = new LeadService(emailService);

  const testData = {
    email: 'test-verification@example.com',
    message: 'This is a verification message from the automated test script.',
  };

  try {
    console.log('Attempting to submit lead:', testData);
    await leadService.submitLead(testData);
    console.log('✅ Lead submitted successfully. Email should have been sent.');
  } catch (error) {
    console.error('❌ Failed to submit lead:', error);
    process.exit(1);
  }
}

verify();
