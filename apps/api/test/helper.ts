import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { FastifyInstance } from 'fastify';
import { build } from '../src/app';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer;
let app: FastifyInstance;

import { UserRepository } from '../src/repositories/user.repository';
import { EntryRepository } from '../src/repositories/entry.repository';
import { NotificationRepository } from '../src/repositories/notification.repository';
// Import other repos as needed for seeding
import { Pool } from 'pg';

export interface TestContext {
  app: FastifyInstance;
  repos: {
    user: UserRepository;
    entry: EntryRepository;
    notification: NotificationRepository;
    // Add others as needed
  };
}

export async function getTestApp(): Promise<TestContext> {
  if (app) {
    return {
      app,
      repos: {
        user: new UserRepository(app.pg.pool),
        entry: new EntryRepository(app.pg.pool),
        notification: new NotificationRepository(app.pg.pool)
      }
    };
  }

  // Start container
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('tracker_test')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start();

  const connectionString = container.getConnectionUri();

  // Run migrations/init.sql
  const client = new Client({ connectionString });
  await client.connect();

  const initSqlPath = path.join(__dirname, '../../../docker/postgres/init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf-8');

  await client.query(initSql);
  await client.end();

  // Build app
  app = build({ logger: false }, { connectionString });
  await app.ready();

  const pool = app.pg.pool;
  const repos = {
    user: new UserRepository(pool),
    entry: new EntryRepository(pool),
    notification: new NotificationRepository(pool)
  };

  return { app, repos };
}

export async function closeTestApp() {
  if (app) {
    await app.close();
  }
  if (container) {
    await container.stop();
  }
}

// Helper to reset DB state between tests if needed
export async function truncateTables(app: FastifyInstance) {
  await app.pg.query('TRUNCATE TABLE users, entries, email_cta_tokens, notifications, audit_logs RESTART IDENTITY CASCADE');
  // Re-seed essential data if needed (like countries)
  await app.pg.query(`
    INSERT INTO country_thresholds (country_code, max_remote_days)
    VALUES ('FR', 34), ('BE', 34), ('DE', 34)
    ON CONFLICT (country_code) DO NOTHING;
  `);
}
