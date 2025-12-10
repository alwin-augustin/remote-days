import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';
import { format } from 'date-fns';
import { randomUUID } from 'crypto';

vi.mock('../../src/services/email.service', () => {
  const EmailService = vi.fn();
  EmailService.prototype.sendEmail = vi.fn().mockResolvedValue(true);
  return { EmailService };
});

describe('Notification Integration', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let adminId: string; // Declare adminId here
  let employeeId: string;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create Admin
    const adminUser = await repos.user.create({
      email: 'admin_notif@test.com',
      first_name: 'NotifAdmin',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'admin',
      password_hash: hashedPassword,
      is_active: true
    });
    adminId = adminUser.user_id;

    // Create Employee (will be user without entry)
    const employeeUser = await repos.user.create({
      email: 'emp_notif@test.com',
      first_name: 'NotifEmp',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true
    });
    employeeId = employeeUser.user_id;

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');

    // Create a notification for Admin (sent prompt)
    await repos.notification.createNotification(
      adminId, 'email', 'daily_prompt', { targetDate: today }
    );
    // Create a CTA token for Admin (responded)
    await repos.notification.createEmailCTAToken(
      adminId, 'home', today, new Date(new Date().setHours(new Date().getHours() + 1)), randomUUID()
    );
    // Set CTA as used
    await app.pg.query(
      `UPDATE email_cta_tokens SET used = TRUE WHERE user_id = $1 AND target_date = $2`,
      [adminId, today]
    );
    // Create an entry for Admin for today
    await repos.entry.upsert(adminId, today, 'office', 'web');

    // Create a notification for Employee (sent prompt, no response, no entry yet)
    await repos.notification.createNotification(
      employeeId, 'email', 'daily_prompt', { targetDate: today }
    );

    // Login Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin_notif@test.com', password: 'password' },
    });
    const adminCookies = adminRes.headers['set-cookie'];
    adminToken = (Array.isArray(adminCookies) ? adminCookies[0] : adminCookies as string).split(';')[0];
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should get notification stats for a date (with data)', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/notifications/stats?date=${today}`,
      headers: { cookie: adminToken },
    });

    expect(res.statusCode).toBe(200);
    const stats = JSON.parse(res.payload);
    expect(stats.total_active_users_notified).toBe('2'); // Admin + Employee
    expect(stats.total_sent_prompts).toBe('2'); // Admin sent, Employee sent
    expect(stats.total_users_responded).toBe('1'); // Only Admin responded
    expect(stats.total_cta_used).toBe('1'); // Only Admin's CTA used
    expect(stats.users_without_entry).toBe('1'); // Only Employee has no entry
  });

  it('should be able to resend prompts to users without entry', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/notifications/resend',
      headers: { cookie: adminToken },
      payload: { date: today },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.notifiedCount).toBeGreaterThanOrEqual(1); // Should send to at least 1 (employee)

    // Verify stats after resend
    const statsRes = await app.inject({
      method: 'GET',
      url: `/api/admin/notifications/stats?date=${today}`,
      headers: { cookie: adminToken },
    });
    expect(statsRes.statusCode).toBe(200);
    const updatedStats = JSON.parse(statsRes.payload);
    expect(parseInt(updatedStats.total_sent_prompts)).toBeGreaterThanOrEqual(3); // Should be 2 initial + 1 resend for employee
    expect(parseInt(updatedStats.total_users_responded)).toBe(1); // Admin responded
    expect(parseInt(updatedStats.users_without_entry)).toBe(1); // Employee still has no entry after resend
  });
});
