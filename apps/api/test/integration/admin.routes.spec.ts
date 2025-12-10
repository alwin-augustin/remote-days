import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from '../helper';
import { FastifyInstance } from 'fastify';

describe('Admin Integration', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let employeeToken: string;
  let adminId: string; // Add adminId here


  beforeAll(async () => {
    const { app: testApp, repos } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create Admin
    const adminUser = await repos.user.create({
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'admin',
      password_hash: hashedPassword,
      is_active: true
    });
    adminId = adminUser.user_id;

    // Create Employee
    await repos.user.create({
      email: 'emp@test.com',
      first_name: 'Emp',
      last_name: 'User',
      country_of_residence: 'FR',
      work_country: 'FR',
      role: 'employee',
      password_hash: hashedPassword,
      is_active: true
    });

    // Login Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password' },
    });
    const adminCookies = adminRes.headers['set-cookie'];
    adminToken = (Array.isArray(adminCookies) ? adminCookies[0] : adminCookies as string).split(';')[0];

    // Login Employee
    const empRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'emp@test.com', password: 'password' },
    });
    const empCookies = empRes.headers['set-cookie'];
    employeeToken = (Array.isArray(empCookies) ? empCookies[0] : empCookies as string).split(';')[0];
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should allow admin to create a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: adminToken },
      payload: {
        email: 'newuser@test.com',
        first_name: 'New',
        last_name: 'User',
        country_of_residence: 'DE',
        work_country: 'DE',
        role: 'employee',
        temp_password: 'password',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload)).toHaveProperty('user_id');
  });

  it('should allow admin to list users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { cookie: adminToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.users).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(3); // Admin + Emp + NewUser
  });

  it('should allow admin to update a user', async () => {
    // Get the user created in previous test
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users?search=newuser',
      headers: { cookie: adminToken },
    });
    const user = JSON.parse(listRes.payload).users[0];

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${user.user_id}`,
      headers: { cookie: adminToken },
      payload: {
        first_name: 'Updated',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).first_name).toBe('Updated');
  });

  it('should allow admin to delete a user', async () => {
    // Get the user
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users?search=newuser',
      headers: { cookie: adminToken },
    });
    const user = JSON.parse(listRes.payload).users[0];

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/users/${user.user_id}`,
      headers: { cookie: adminToken },
    });

    expect(res.statusCode).toBe(204);

    // Verify soft delete
    const checkRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users?search=newuser',
      headers: { cookie: adminToken },
    });
    expect(JSON.parse(checkRes.payload).users.length).toBe(0);
  });

  it('should allow admin to manage countries', async () => {
    // Add Country
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/admin/countries',
      headers: { cookie: adminToken },
      payload: { country_code: 'US', max_remote_days: 50 },
    });
    expect(addRes.statusCode).toBe(201);

    // List Countries
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/countries',
      headers: { cookie: adminToken },
    });
    expect(listRes.statusCode).toBe(200);
    const countries = JSON.parse(listRes.payload);
    expect(countries.find((c: any) => c.country_code === 'US')).toBeDefined();

    // Update Country
    const updateRes = await app.inject({
      method: 'PUT',
      url: '/api/admin/countries/US',
      headers: { cookie: adminToken },
      payload: { max_remote_days: 60 },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.payload).max_remote_days).toBe(60);
  });

  it('should forbid employee from creating a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: employeeToken },
      payload: {
        email: 'hacker@test.com',
        first_name: 'Hacker',
        last_name: 'User',
        country_of_residence: 'DE',
        work_country: 'DE',
        role: 'admin',
        temp_password: 'password',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('should forbid employee from listing users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { cookie: employeeToken },
    });

    expect(res.statusCode).toBe(403);
  });
});
