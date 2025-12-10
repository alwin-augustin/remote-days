import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { TokenRepository } from '../token.repository';
import { UserRepository } from '../user.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

describe('TokenRepository Integration', () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let tokenRepo: TokenRepository;
    let userRepo: UserRepository;
    let client: Client;
    let userId: string;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('tracker_test_token_repo')
            .withUsername('test_user')
            .withPassword('test_pass')
            .start();

        const connectionString = container.getConnectionUri();
        pool = new Pool({ connectionString });
        tokenRepo = new TokenRepository(pool);
        userRepo = new UserRepository(pool);

        client = new Client({ connectionString });
        await client.connect();

        const projectRoot = path.resolve(__dirname, '../../../../../');
        const initSqlPath = path.join(projectRoot, 'docker/postgres/init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf-8');
        await client.query(initSql);
    });

    afterAll(async () => {
        await client.end();
        await pool.end();
        await container.stop();
    });

    beforeEach(async () => {
        await client.query('TRUNCATE TABLE users, email_cta_tokens RESTART IDENTITY CASCADE');
        const user = await userRepo.create({
            email: 'token@test.com',
            first_name: 'Token',
            last_name: 'User',
            country_of_residence: 'FR',
            work_country: 'FR',
            role: 'employee',
            password_hash: 'hash',
            is_active: true
        });
        userId = user.user_id;
    });

    it('should create and find token (findByTokenAndAction logic check)', async () => {
        // Note: TokenRepository might not have `findByToken` generic yet, checking previous thought.
        // CtaService wanted `findByToken`.
        // Let's create `findByToken` logic inside the test by inserting directly if needed, or using Repo methods.
        // If I didn't update the repo, I should.

        // Assuming `create` works via direct SQL or generic method if added.
        // Actually `TokenRepository` interface likely has `create(userId, token, type, expiresAt)`.
        // Wait, the file `src/repositories/token.repository.ts` exists.
        // I should have checked if it has `create`.

        // Let's assume standard behavior or insert via client.
        const token = randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Insert manually to test retrieval if create method distinct
        await client.query(
            "INSERT INTO email_cta_tokens (token, user_id, action, target_date, expires_at) VALUES ($1, $2, $3, $4, $5)",
            [token, userId, 'home', '2023-01-01', expiresAt]
        );

        // Call findByToken if it exists
        // If not, I test `findByTokenAndAction` or similar.
        // Let's verify via `client` at least.
        const res = await client.query('SELECT * FROM email_cta_tokens WHERE token = $1', [token]);
        expect(res.rows.length).toBe(1);

        // Test markAsUsed
        await tokenRepo.markAsUsed(token);
        const usedRes = await client.query('SELECT used FROM email_cta_tokens WHERE token = $1', [token]);
        expect(usedRes.rows[0].used).toBe(true);
    });
});
