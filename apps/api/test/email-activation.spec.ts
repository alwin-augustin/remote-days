import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from './helper';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../src/services/email.service';
import { config } from '../src/config/env'; // Added

// Mock EmailService
const sendEmailSpy = vi.fn();
vi.mock('../src/services/email.service', () => {
  return {
    EmailService: class {
      async sendEmail(...args: any[]) {
        sendEmailSpy(...args);
      }
    },
  };
});

describe('Email Activation & User Onboarding Flow', () => {
  let app: any;
  let hrToken: string;
  let activationToken: string;
  const importedEmail = 'new-employee@test.com';

  beforeAll(async () => {
    const { app: testApp } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    // 1. Create Admin & HR for setup
    const adminHash = await bcrypt.hash('admin123', 10);
    await app.pg.query(
      'INSERT INTO users (user_id, email, first_name, last_name, country_of_residence, work_country, role, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      ['00000000-0000-0000-0000-000000000001', 'admin@test.com', 'Admin', 'User', 'FR', 'FR', 'admin', adminHash, true]
    );

    const hrHash = await bcrypt.hash('hr123', 10);
    await app.pg.query(
      'INSERT INTO users (user_id, email, first_name, last_name, country_of_residence, work_country, role, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      ['00000000-0000-0000-0000-000000000002', 'hr@test.com', 'HR', 'Manager', 'FR', 'FR', 'hr', hrHash, true]
    );

    // Login as HR
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'hr@test.com', password: 'hr123' },
    });

    const cookies = loginRes.headers['set-cookie'] as string[] | string;
    if (Array.isArray(cookies)) {
      hrToken =
        cookies
          .find((c) => c.startsWith('token='))
          ?.split(';')[0]
          .split('=')[1] || '';
    } else {
      hrToken = cookies.split(';')[0].split('=')[1] || '';
    }
  });

  afterAll(async () => {
    await closeTestApp();
    vi.clearAllMocks();
  });

  it('Step 1: HR Imports Employee -> Triggers Activation Email', async () => {
    const csvContent = `email,first_name,last_name,country_of_residence,work_country
${importedEmail},New,Employee,FR,FR`;
    const buffer = Buffer.from(csvContent);

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/import',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': 'multipart/form-data',
      },
      payload: (() => {
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), 'one-employee.csv');
        return formData;
      })(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().inserted).toBe(1);

    // Verify Email Sent
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const [to, subject, text, html] = sendEmailSpy.mock.calls[0];
    expect(to).toBe(importedEmail);
    expect(subject).toBe('Activate Your Account');
    expect(text).toContain(`${config.APP_URL}/reset-password?token=`);
  });

  it('Step 2: Verify Default Password does NOT work', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: importedEmail, password: 'changeMe123!' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('Step 3: Submit Activation Token and Set Password', async () => {
    // Retrieve token from DB (since we can't easily parse it from the spied function args in this scope without regex)
    // Or we could parse it from `sendEmailSpy` args if we really wanted to be pure blackbox.
    // Let's query DB for stability.
    const tokenRes = await app.pg.query(
      "SELECT token FROM email_cta_tokens JOIN users ON users.user_id = email_cta_tokens.user_id WHERE users.email = $1 AND action = 'password-reset'",
      [importedEmail]
    );
    activationToken = tokenRes.rows[0].token;
    expect(activationToken).toBeDefined();

    const newPassword = 'myNewSecurePassword123!';

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset', // Using existing reset endpoint
      payload: {
        token: activationToken,
        password: newPassword,
      },
    });

    expect(res.statusCode).toBe(200);
  });

  it('Step 4: Login with New Password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: importedEmail, password: 'myNewSecurePassword123!' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
