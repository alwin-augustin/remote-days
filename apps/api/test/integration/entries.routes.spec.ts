import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';

describe('Entries Integration', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    await repos.user.create({
      email: 'user@test.com',
      first_name: 'User',
      last_name: 'Test',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true
    });

    // We need the ID. repo.create returns the created user?
    const createdUser = await repos.user.findByEmail('user@test.com');
    if (!createdUser) throw new Error('User creation failed');
    userId = createdUser.user_id;

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'user@test.com', password: 'password' }, // Matches unhashed 'password'
    });
    const cookies = res.headers['set-cookie'];
    token = (Array.isArray(cookies) ? cookies[0] : cookies as string).split(';')[0];
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should create an entry', async () => {
    const date = new Date().toISOString().split('T')[0];
    const res = await app.inject({
      method: 'POST',
      url: '/api/entries',
      headers: { cookie: token },
      payload: {
        date,
        status: 'home',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('home');
    expect(body.user_id).toBe(userId);
  });

  it('should update entry idempotently (upsert)', async () => {
    const date = new Date().toISOString().split('T')[0];
    // Update status to 'office' for same date
    const res = await app.inject({
      method: 'POST',
      url: '/api/entries',
      headers: { cookie: token },
      payload: {
        date,
        status: 'office',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe('You have already declared your status for this day.');
    // Status should NOT change

    // Verify count is still 1
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/entries?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
      headers: { cookie: token },
    });
    const list = JSON.parse(listRes.payload);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('home'); // Remains home
  });

  it('should get stats correctly', async () => {
    // We have 1 office day from previous test
    const res = await app.inject({
      method: 'GET',
      url: '/api/entries/stats',
      headers: { cookie: token },
    });

    expect(res.statusCode).toBe(200);
    const stats = JSON.parse(res.payload);
    expect(stats.office).toBe(0);
    expect(stats.home).toBe(1);
  });
});
