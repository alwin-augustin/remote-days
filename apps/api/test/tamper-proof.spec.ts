import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from './helper';
import bcrypt from 'bcrypt';

describe('Security & GDPR Compliance', () => {
  let app: any;
  let employeeToken: string;
  let employeeId: string;

  beforeAll(async () => {
    const { app: testApp } = await getTestApp();
    app = testApp;
    await truncateTables(app);

    // 1. Register/Create User
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register', // Check if register exists or we use admin create
      // Admin create is typical
    });

    // Let's use internal userRepo to create a user for testing login/etc
    // Or generic "create user via repositories" pattern if available in helper
    // Since I don't see easy helper for creating user+token, I'll use repositories directly
    // But app.inject is better for integration.
    // Admin creates user.

    // Plan:
    // 1. Manually insert user via DB for speed/reliability
    // 2. Login to get token
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('Scenario: Tamper-Proofing, Export, and Deletion', async () => {
    // --- Setup: Create User ---
    const email = 'gdpr-test@example.com';
    const password = 'securePass123!';

    // We need hash
    // Since we can't easily import bcrypt client-side in test without deps (it is devDep), we can rely on app?
    // Or just use the /api/admin/users endpoint if we have admin token.
    // Let's assume we can mock or just insert with known hash if possible.
    // Easier: Use the Admin API or just Repo if exposed in `app`.
    // `getTestApp` returns `repos`.

    const { repos } = await getTestApp(); // This creates NEW instances on same pool.

    // Create User
    // We need a manual hash or use AuthService if exposed.
    // Let's use a simple bcrypt hash for 'password'
    // $2b$10$EpJou... is 'password' usually.
    // Actually, let's use the register endpoint if it exists? No, it's admin-only creation.

    // Let's insert a user with a known password hash.
    // Since I don't have bcrypt here easily, I'll trust the Admin API flow
    // OR better: Create a "Test Admin" first, then use it.
    // But seeding creates admin? `init.sql`.

    // "admin@example.com" / "admin123" is usually default seed?
    // Let's try to login as Admin.

    const adminToken = '';
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'password123' }, // Guessing seed password
    });

    // If seed didn't run or different pass...
    // `setup.ts` or `helper.ts` runs `init.sql`.
    // Let's check `init.sql` content? I saw it in search but didn't read content.
    // Assuming I can't guess admin, I will INSERT my own user via `repos`.

    const salt = '$2b$10$EpJou7g/./././././././.'; // Invalid salt but format
    // Actually, just use bcrypt if available in devDependencies.
    // It IS in `package.json` devDefaults.
    // It IS in `package.json` devDefaults.
    const hash = await bcrypt.hash(password, 10);

    const user = await repos.user.create({
      email,
      first_name: 'Gdpr',
      last_name: 'Tester',
      country_of_residence: 'FR',
      work_country: 'FR',
      password_hash: hash,
      role: 'employee',
    });
    employeeId = user.user_id;

    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);
    employeeToken = loginRes.cookies.find((c: any) => c.name === 'token').value;
    // Also checks payload for user

    // --- 1. Tamper Proofing ---
    const today = new Date().toISOString().split('T')[0];

    // Create Entry
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/entries',
      headers: { Cookie: `token=${employeeToken}` },
      payload: { date: today, status: 'home' },
    });
    expect(createRes.statusCode).toBe(201);

    // Try to Overwrite (Tamper)
    const tamperRes = await app.inject({
      method: 'POST',
      url: '/api/entries',
      headers: { Cookie: `token=${employeeToken}` },
      payload: { date: today, status: 'office' },
    });
    expect(tamperRes.statusCode).toBe(409); // Conflict

    // --- 2. GDPR Export ---
    const exportRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me/export',
      headers: { Cookie: `token=${employeeToken}` },
    });
    expect(exportRes.statusCode).toBe(200);
    const data = JSON.parse(exportRes.payload);
    expect(data.profile.email).toBe(email);
    expect(data.exported_at).toBeDefined();

    // --- 3. GDPR Delete ---
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/api/auth/me',
      headers: { Cookie: `token=${employeeToken}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    // Verify Login Fails
    const failLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
    // Should be 401 or 404 depending on auth service handling of "User not found"
    // AuthService usually throws "Invalid credentials" if user not found via email.
    expect(failLogin.statusCode).not.toBe(200);

    // Verify Token invalid (Access Resource)
    const accessRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Cookie: `token=${employeeToken}` },
    });
    // If middleware checks DB via `findById` (which now has is_active=true),
    // it should fail to attach user or return error.
    expect(accessRes.statusCode).not.toBe(200);
  });
});
