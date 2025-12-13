import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp, truncateTables } from './helper';
import * as bcrypt from 'bcrypt';

describe('HR Onboarding & User Import Integration', () => {
    let app: any;
    let adminToken: string;
    let hrToken: string;

    beforeAll(async () => {
        const { app: testApp } = await getTestApp();
        app = testApp;

        // Clean DB first to avoid conflicts
        await truncateTables(app);

        // 1. Create Admin User Setup
        const adminHash = await bcrypt.hash('admin123', 10);
        await app.pg.query(
            "INSERT INTO users (user_id, email, first_name, last_name, country_of_residence, work_country, role, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            ['00000000-0000-0000-0000-000000000001', 'admin@test.com', 'Admin', 'User', 'FR', 'FR', 'admin', adminHash, true]
        );

        // Login as Admin to get token
        const adminLogin = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email: 'admin@test.com', password: 'admin123' }
        });

        // Extract token from Cookie
        const cookies = adminLogin.headers['set-cookie'] as string[] | string;
        if (Array.isArray(cookies)) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                adminToken = tokenCookie.split(';')[0].split('=')[1];
            }
        } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
            adminToken = cookies.split(';')[0].split('=')[1];
        }
    });

    afterAll(async () => {
        await closeTestApp();
    });

    it('Step 1: Admin creates an HR user', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/admin/users',
            headers: { Authorization: `Bearer ${adminToken}` },
            payload: {
                email: 'hr@test.com',
                first_name: 'HR',
                last_name: 'Manager',
                country_of_residence: 'FR',
                work_country: 'FR',
                role: 'hr',
                temp_password: 'hrpassword123'
            }
        });

        if (res.statusCode !== 201) {
            console.log('Step 1 Failed. Body:', res.body);
        }
        expect(res.statusCode).toBe(201);
        const user = await app.pg.query("SELECT * FROM users WHERE email = 'hr@test.com'");
        expect(user.rows[0].role).toBe('hr');
    });

    it('Step 2: HR Login & Token Acquisition', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email: 'hr@test.com', password: 'hrpassword123' }
        });

        expect(res.statusCode).toBe(200);

        // Extract token from Cookie
        const cookies = res.headers['set-cookie'] as string[] | string;
        if (Array.isArray(cookies)) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                hrToken = tokenCookie.split(';')[0].split('=')[1];
            }
        } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
            hrToken = cookies.split(';')[0].split('=')[1];
        }

        expect(hrToken).toBeDefined();
    });

    it('Step 3: HR Imports 50 Employees via CSV', async () => {
        const csvContent = ['email,first_name,last_name,country_of_residence,work_country'];
        for (let i = 1; i <= 50; i++) {
            csvContent.push(`employee${i}@test.com,Employee,${i},FR,FR`);
        }
        const buffer = Buffer.from(csvContent.join('\n'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/admin/users/import',
            headers: {
                'Authorization': `Bearer ${hrToken}`,
                'Content-Type': 'multipart/form-data',
            },
            payload: (() => {
                const formData = new FormData();
                formData.append('file', new Blob([buffer]), 'employees.csv');
                return formData;
            })()
        });

        if (res.statusCode !== 200) {
            console.log('Step 3 Failed. Body:', res.body);
        }

        expect(res.statusCode).toBe(200);
        expect(res.json().inserted).toBe(50);

        // Verify Database
        const countRes = await app.pg.query("SELECT count(*) FROM users WHERE email LIKE 'employee%@test.com'");
        expect(parseInt(countRes.rows[0].count)).toBe(50);
    }, 60000); // Increased timeout just in case

    it('Step 4: Verify Default Password Behavior (Risk Check)', async () => {
        // Try logging in as one of the imported users with default password
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email: 'employee1@test.com', password: 'changeMe123!' }
        });

        // This SHOULD pass currently (proving the risk identified in plan)
        expect(res.statusCode).toBe(200);
        // Token is in cookie, so checking 200 is sufficient to prove login success
    });
});
