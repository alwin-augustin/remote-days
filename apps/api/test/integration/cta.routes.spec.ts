import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

describe('CTA Integration', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    const user = await repos.user.create({
      email: 'cta@test.com',
      first_name: 'CTA',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true
    });
    userId = user.user_id;

    token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert token directly
    await app.pg.query(
      "INSERT INTO email_cta_tokens (token, user_id, action, target_date, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [token, userId, 'home', new Date().toISOString().split('T')[0], expiresAt]
    );
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should record status via one-click token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cta/process',
      payload: { token }
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual(expect.objectContaining({
      message: 'Status recorded',
      status: 'home'
    })); // date might be present, ignoring exact match for now

    // Verify entry
    const { rows } = await app.pg.query('SELECT * FROM entries WHERE user_id = $1', [userId]);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('home');
    expect(rows[0].source).toBe('email_link');
  });

  it('should fail with invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cta/process',
      payload: { token: randomUUID() }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ status: 'error', message: 'Invalid token' });
  });
});
