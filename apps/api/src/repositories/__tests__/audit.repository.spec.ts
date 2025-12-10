import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { AuditRepository } from '../audit.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

describe('AuditRepository Integration', () => {
    let container: StartedPostgreSqlContainer;
    let pool: Pool;
    let auditRepo: AuditRepository;
    let client: Client;

    let actorId: string;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('tracker_test_audit_repo')
            .withUsername('test_user')
            .withPassword('test_pass')
            .start();

        const connectionString = container.getConnectionUri();
        pool = new Pool({ connectionString });
        auditRepo = new AuditRepository(pool);

        client = new Client({ connectionString });
        await client.connect();

        const projectRoot = path.resolve(__dirname, '../../../../../');
        const initSqlPath = path.join(projectRoot, 'docker/postgres/init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf-8');
        await client.query(initSql);

        const uRes = await client.query(
            "INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id",
            ['audit@test.com', 'Audit', 'User', 'FR', 'FR', 'hash', 'employee']
        );
        actorId = uRes.rows[0].user_id;
    });

    afterAll(async () => {
        await client.end();
        await pool.end();
        await container.stop();
    });

    beforeEach(async () => {
        await client.query('TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE');
    });

    it('should log an event', async () => {
        // Use real UUIDs for actor (FK constraint) and entity (if entry type)
        await auditRepo.log(
            'login',
            actorId,
            actorId, // Target equal to actor for login
            'User logged in',
            'user',
            actorId,
            'audit@test.com',
            'Audit',
            'User',
            'audit@test.com',
            'Audit',
            'User',
            { ip: '1.1.1.1' }
        );

        const logs = await auditRepo.getAuditLogs();
        expect(logs.length).toBe(1);
        expect(logs[0].action).toBe('login');
        expect(logs[0].details.ip).toBe('1.1.1.1');
    });

    it('should filter audit logs', async () => {
        // Pass all required args correctly
        await auditRepo.log('login', actorId, actorId, 'login', 'user', actorId, undefined, undefined, undefined, undefined, undefined, undefined, {});
        await auditRepo.log('logout', actorId, actorId, 'logout', 'user', actorId, undefined, undefined, undefined, undefined, undefined, undefined, {});

        const loginLogs = await auditRepo.getAuditLogs(undefined, undefined, 'login');
        expect(loginLogs.length).toBe(1);
        expect(loginLogs[0].action).toBe('login');
    });
});
