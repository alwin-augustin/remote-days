import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';

describe('Entries Routes Integration', () => {
  let app: FastifyInstance;
  let hrToken: string;
  let employeeToken: string;
  let employeeId: string;
  let hrId: string;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create HR
    const hr = await repos.user.create({
      email: 'hr@test.com',
      first_name: 'HR',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'hr',
      password_hash: hashedPassword,
      is_active: true,
    });
    hrId = hr.user_id;

    // Create Employee
    const emp = await repos.user.create({
      email: 'emp@test.com',
      first_name: 'Emp',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true,
    });
    employeeId = emp.user_id;

    // Login HR
    const resHr = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'hr@test.com', password: 'password' },
    });
    const cookiesHr = resHr.headers['set-cookie'];
    hrToken = (Array.isArray(cookiesHr) ? cookiesHr[0] : (cookiesHr as string)).split(';')[0];

    // Login Employee
    const resEmp = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'emp@test.com', password: 'password' },
    });
    const cookiesEmp = resEmp.headers['set-cookie'];
    employeeToken = (Array.isArray(cookiesEmp) ? cookiesEmp[0] : (cookiesEmp as string)).split(';')[0];
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should allow HR to override an entry with a reason and log audit', async () => {
    const date = '2025-05-20';
    const status = 'office';
    const reason = 'Mandatory on-site meeting';

    // 1. Call Override Endpoint
    const res = await app.inject({
      method: 'POST',
      url: '/api/entries/override',
      headers: { cookie: hrToken },
      payload: {
        targetUserId: employeeId,
        date,
        status,
        reason,
      },
    });

    if (res.statusCode !== 200) {
      console.error('Response Payload:', res.payload);
    }
    expect(res.statusCode).toBe(200);
    const updatedEntry = JSON.parse(res.payload);
    expect(updatedEntry.status).toBe('office');
    expect(updatedEntry.user_id).toBe(employeeId);

    // 2. Verify DB Entry
    const dbEntryRes = await app.pg.query('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [employeeId, date]);
    expect(dbEntryRes.rows.length).toBe(1);
    expect(dbEntryRes.rows[0].status).toBe('office');
    // Ensure source indicates it involved an actor/manual change if applicable,
    // though repository currently just sets it to 'web'. We might want to improve this later.

    // 3. Verify Audit Log
    const auditRes = await app.pg.query('SELECT * FROM audit_logs WHERE action = $1 ORDER BY created_at DESC LIMIT 1', [
      'OVERRIDE',
    ]);
    expect(auditRes.rows.length).toBe(1);
    const log = auditRes.rows[0];
    expect(log.actor_user_id).toBe(hrId);
    expect(log.reason).toBe(reason);
    expect(log.details.user_id).toBe(employeeId);
    expect(log.details.new_status).toBe('office');
  });

  it('should reject override if reason is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/entries/override',
      headers: { cookie: hrToken },
      payload: {
        targetUserId: employeeId,
        date: '2025-05-21',
        status: 'home',
        reason: '   ', // Empty reason
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should reject non-HR/Admin users', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/entries/override',
      headers: { cookie: employeeToken },
      payload: {
        targetUserId: employeeId, // trying to override self or other
        date: '2025-05-22',
        status: 'home',
        reason: 'self override',
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
