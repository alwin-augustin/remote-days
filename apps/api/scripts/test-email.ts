
import dotenv from 'dotenv';
import path from 'path';

// Load env before imports
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Mock required env vars for standalone execution (bypass strict validation)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy-secret-for-testing';
process.env.PORT = process.env.PORT || '3000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
process.env.SMTP_USER = process.env.SMTP_USER || 'dummy';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'dummy';

import fs from 'fs';
// path already imported at the top

import { emailService } from '../src/services/email.service';
import { generateEmailHtml } from '../src/services/email-templates';

async function sendTest() {
    console.log('--- Sending Test Email ---');

    const testEmail = 'alwin.augustin@example.com'; // You can change this or read from env
    const html = generateEmailHtml(
        'Welcome to Teletravail Tracker',
        'Alwin Augustin',
        'This is a test email to verify the new design system. We have updated our look with a cleaner interface, better typography (Inter), and a vibrant blue primary color. <br><br> We hope you like it!',
        [
            { label: 'Go to Dashboard', url: 'http://localhost:5173', color: 'primary' },
            { label: 'Read Documentation', url: 'http://localhost:5173/docs', color: 'secondary' }
        ]
    );

    // Save preview
    const previewPath = path.join(__dirname, 'email-preview.html');
    fs.writeFileSync(previewPath, html);
    console.log(`Preview saved to: ${previewPath}`);

    await emailService.sendEmail(
        testEmail,
        'Test Email - Teletravail Tracker Design Update',
        'HTML content not displayed.',
        html
    );

    console.log('--- Test Email Sent ---');
    console.log(`To: ${testEmail}`);
    console.log('Check Ethereal URL (if using Ethereal) or your SMTP inbox.');
}

sendTest().catch(console.error);
