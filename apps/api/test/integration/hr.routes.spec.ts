import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';

describe('HR Integration', () => {
  let app: FastifyInstance;
  let hrToken: string;
  let employeeId: string;
  let entryId: string;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create HR
    await repos.user.create({
      email: 'hr@test.com',
      first_name: 'HR',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'hr',
      password_hash: hashedPassword,
      is_active: true
    });

    // Create Employee
    const emp = await repos.user.create({
      email: 'emp@test.com',
      first_name: 'Emp',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true
    });
    employeeId = emp.user_id;

    // Login HR
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'hr@test.com', password: 'password' },
    });
    const cookies = res.headers['set-cookie'];
    hrToken = (Array.isArray(cookies) ? cookies[0] : cookies as string).split(';')[0];

    // Create Entry for Employee
    const today = new Date().toISOString().split('T')[0];
    const entry = await repos.entry.upsert(employeeId, today, 'home', 'web');
    entryId = entry.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should get employee summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/hr/summary',
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const summaries = JSON.parse(res.payload);
    expect(summaries).toBeInstanceOf(Array);
    const empSummary = summaries.find((s: any) => s.user_id === employeeId);
    expect(empSummary).toBeDefined();
    // We created 1 home entry, so days_used should be 1
    expect(parseInt(empSummary.days_used_current_year)).toBe(1);
  });

  it('should get employee entries list', async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const res = await app.inject({
      method: 'GET',
      url: `/api/hr/entries?year=${year}&month=${month}`,
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.payload);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('should get daily stats', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/hr/stats/daily?date=${today}`,
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const stats = JSON.parse(res.payload);
    expect(parseInt(stats.home)).toBe(1);
  });

  it('should get daily entries details', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/hr/entries/daily?date=${today}`,
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.payload);
    expect(list.find((e: any) => e.user_id === employeeId).status).toBe('home');
  });

  it('should override employee entry', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/hr/stats/daily?date=${today}`,
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const stats = JSON.parse(res.payload);
    expect(parseInt(stats.home)).toBe(1);
  });

  it('should override employee entry', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/hr/entries/${entryId}`,
      headers: { cookie: hrToken },
      payload: {
        status: 'office',
        reason: 'Correction requested',
      },
    });

    expect(res.statusCode).toBe(200);
    const updatedEntry = JSON.parse(res.payload);
    expect(updatedEntry.status).toBe('office');
    expect(updatedEntry.source).toBe('hr_correction');
  });

  it('should get risk stats', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/hr/stats/risk?date=${today}`,
      headers: { cookie: hrToken },
    });

    expect(res.statusCode).toBe(200);
    const stats = JSON.parse(res.payload);
    expect(stats.danger_count).toBeDefined();
    expect(stats.warning_count).toBeDefined();
    expect(stats.missing_count).toBeDefined();
  });
});
