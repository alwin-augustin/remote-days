import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { HRRepository } from '../hr.repository';
import { UserRepository } from '../user.repository';
import { EntryRepository } from '../entry.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

describe('HRRepository Integration', () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let hrRepo: HRRepository;
    let userRepo: UserRepository;
    let entryRepo: EntryRepository;
    let client: Client;
    let empId: string;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('tracker_test_hr_repo')
            .withUsername('test_user')
            .withPassword('test_pass')
            .start();

        const connectionString = container.getConnectionUri();
        pool = new Pool({ connectionString });
        hrRepo = new HRRepository(pool);
        userRepo = new UserRepository(pool);
        entryRepo = new EntryRepository(pool);

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
        await client.query('TRUNCATE TABLE users, entries RESTART IDENTITY CASCADE');
        const emp = await userRepo.create({
            email: 'hr_emp@test.com',
            first_name: 'HR',
            last_name: 'Emp',
            country_of_residence: 'FR',
            work_country: 'FR',
            role: 'employee',
            password_hash: 'hash',
            is_active: true
        });
        empId = emp.user_id;

        // Seed some entries
        await entryRepo.upsert(empId, '2023-01-01', 'home', 'web');
    });

    it('should get employee summaries', async () => {
        const list = await hrRepo.getEmployeeSummaries();
        expect(list.length).toBeGreaterThanOrEqual(1);
        expect(list[0].user_id).toBe(empId);
    });

    it('should update entry', async () => {
        let entry = await entryRepo.upsert(empId, '2023-01-02', 'home', 'web');
        // Use the empId itself or another valid UUID as actor
        const updated = await hrRepo.updateEntry(entry.id, 'office', 'correction', empId);
        expect(updated.status).toBe('office');
    });
});
