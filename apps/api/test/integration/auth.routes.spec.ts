import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';
import { Repositories } from '../../src/repositories'; // Assuming Repositories type is available

describe('Auth Integration', () => {
  let app: FastifyInstance;
  let userRepo: any;

  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    userRepo = repos.user;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should login successfully with valid credentials', async () => {
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create user
    await userRepo.create({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieString).toContain('token=');
  });

  it('should fail with invalid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should get current user profile', async () => {
    // Login first to get token (reuse previous flow or create helper if needed, but we can just re-login or use token from first test if we saved it.
    // Tests in same file run sequentially by default in vitest unless configured otherwise, but better to be explicit)

    // Let's just re-login to be safe and explicit
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const cookies = loginRes.headers['set-cookie'];
    const token = (Array.isArray(cookies) ? cookies[0] : (cookies as string)).split(';')[0];

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: token },
    });

    expect(meRes.statusCode).toBe(200);
    expect(JSON.parse(meRes.payload).email).toBe('test@example.com');
  });

  it('should logout successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(res.statusCode).toBe(204);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieString = Array.isArray(cookies) ? cookies[0] : (cookies as string);
    // Expect cookie to be cleared (empty value or past expiration)
    expect(cookieString).toContain('token=;');
  });
});
