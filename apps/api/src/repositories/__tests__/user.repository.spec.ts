import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRepository } from '../user.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

describe('UserRepository Integration', () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let userRepo: UserRepository;
    let client: Client;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('tracker_test_user_repo')
            .withUsername('test_user')
            .withPassword('test_pass')
            .start();

        const connectionString = container.getConnectionUri();
        pool = new Pool({ connectionString });
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
        await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    });

    it('should create and find a user', async () => {
        const user = await userRepo.create({
            email: 'new@test.com',
            first_name: 'New',
            last_name: 'User',
            country_of_residence: 'FR',
            work_country: 'FR',
            role: 'employee',
            password_hash: 'hash',
            is_active: true
        });

        expect(user.email).toBe('new@test.com');
        expect(user.user_id).toBeDefined();

        const found = await userRepo.findByEmail('new@test.com');
        expect(found).toBeDefined();
        expect(found?.user_id).toBe(user.user_id);
    });

    it('should update a user', async () => {
        const user = await userRepo.create({
            email: 'update@test.com',
            first_name: 'Update',
            last_name: 'User',
            country_of_residence: 'FR',
            work_country: 'FR',
            role: 'employee',
            password_hash: 'hash'
        });

        const updated = await userRepo.update(user.user_id, { first_name: 'UpdatedName' });
        expect(updated?.first_name).toBe('UpdatedName');
    });

    it('should soft delete a user', async () => {
        const user = await userRepo.create({
            email: 'delete@test.com',
            first_name: 'Delete',
            last_name: 'User',
            country_of_residence: 'FR',
            work_country: 'FR',
            role: 'employee',
            password_hash: 'hash'
        });

        await userRepo.softDelete(user.user_id);
        const found = await userRepo.findById(user.user_id);
        expect(found).not.toBeNull();
        expect(found?.is_active).toBe(false);

        // Check DB directly to confirm soft delete
        const res = await client.query('SELECT is_active FROM users WHERE user_id = $1', [user.user_id]);
        expect(res.rows[0].is_active).toBe(false);
    });
});
