import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { build } from '../src/app';
import * as fs from 'fs';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Mock email service to prevent actual email sending
vi.mock('../src/services/email.service', () => {
  const EmailService = vi.fn();
  EmailService.prototype.sendEmail = vi.fn().mockResolvedValue(true);
  return { EmailService };
});

describe('User Import Feature', () => {
    let container: StartedPostgreSqlContainer;
    let server: FastifyInstance;
    let pool: Pool;
    let token: string;

    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:15-alpine").start();
        const connectionString = container.getConnectionUri();

        pool = new Pool({ connectionString });

        // Init DB
        const initSql = fs.readFileSync(path.join(__dirname, '../../../docker/postgres/init.sql'), 'utf-8');
        await pool.query(initSql);

        // Create Admin User
        const hash = await bcrypt.hash('password123', 10);
        const adminId = '00000000-0000-0000-0000-000000000001';
        await pool.query(
            `INSERT INTO users (user_id, email, first_name, last_name, country_of_residence, work_country, role, password_hash, is_active)
       VALUES ($1, 'admin@example.com', 'Admin', 'User', 'FR', 'FR', 'admin', $2, true)`,
            [adminId, hash]
        );

        server = build({ logger: false }, { connectionString });
        await server.ready();

        // Login to get token
        const loginRes = await server.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email: 'admin@example.com', password: 'password123' },
        });
        // Extract token from Cookie
        const cookies = loginRes.headers['set-cookie'] as string[] | string;
        if (Array.isArray(cookies)) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                token = tokenCookie.split(';')[0].split('=')[1];
            }
        } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
            token = cookies.split(';')[0].split('=')[1];
        }
    }, 60000);

    afterAll(async () => {
        await server.close();
        await pool.end();
        await container.stop();
    });

    it('should import users from valid CSV', async () => {
        const csvContent = `email,first_name,last_name,country_of_residence,work_country
test1@example.com,Test,One,FR,FR
test2@example.com,Test,Two,BE,BE`;

        const boundary = '--------------------------boundary';
        const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="users.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n--${boundary}--`;

        const response = await server.inject({
            method: 'POST',
            url: '/api/admin/users/import',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            payload: payload
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.total).toBe(2);
        expect(body.inserted).toBe(2);
        expect(body.errors).toHaveLength(0);

        // Verify DB
        const { rows } = await pool.query("SELECT * FROM users WHERE email IN ('test1@example.com', 'test2@example.com')");
        expect(rows).toHaveLength(2);
        expect(rows[0].role).toBe('employee');
    });

    it('should handle duplicate users and validation errors', async () => {
        const csvContent = `email,first_name,last_name,country_of_residence,work_country
test1@example.com,Test,One,FR,FR
invalid-email,Bad,User,FR,FR
new@example.com,New,User,DE,DE`;

        const boundary = '--------------------------boundary';
        const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="users.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n--${boundary}--`;

        const response = await server.inject({
            method: 'POST',
            url: '/api/admin/users/import',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            payload: payload
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.total).toBe(3);
        // test1 already exists from previous test -> skipped
        // invalid-email -> error
        // new@example.com -> inserted
        expect(body.inserted).toBe(1);
        expect(body.errors.length).toBeGreaterThanOrEqual(2);

        const duplicateError = body.errors.find((e: any) => e.email === 'test1@example.com');
        expect(duplicateError).toBeDefined();

        // Check error details if possible (row number etc)
    });
});
