import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { NotificationRepository } from '../notification.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { format } from 'date-fns';

describe('NotificationRepository Integration', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let notificationRepo: NotificationRepository;
  let client: Client; // Direct client for setup

  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    // Start container
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('tracker_test_repo')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    notificationRepo = new NotificationRepository(pool);

    // Run migrations/init.sql
    client = new Client({ connectionString });
            await client.connect();
            
            const projectRoot = path.resolve(__dirname, '../../../../../'); // Go up to project root
            const initSqlPath = path.join(projectRoot, 'docker/postgres/init.sql');
            const initSql = fs.readFileSync(initSqlPath, 'utf-8');        await client.query(initSql);
    // Setup dummy users and data for tests
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');

    // Create users
    const user1Res = await client.query(
        "INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id;",
        ['repo1@test.com', 'Repo', 'User1', 'FR', 'FR', 'hashedpass', 'employee']
    );
    userId1 = user1Res.rows[0].user_id;

    const user2Res = await client.query(
        "INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id;",
        ['repo2@test.com', 'Repo', 'User2', 'FR', 'FR', 'hashedpass', 'employee']
    );
    userId2 = user2Res.rows[0].user_id;

    // Create notifications and CTA tokens
    // User1: Sent prompt, responded
    await client.query(
        "INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at) VALUES ($1, 'email', 'daily_prompt', '{}', $2::timestamp);",
        [userId1, new Date()]
    );
    await client.query(
        "INSERT INTO email_cta_tokens (user_id, action, target_date, expires_at, used) VALUES ($1, 'home', $2::date, $3::timestamp, TRUE);",
        [userId1, today, new Date(new Date().setHours(new Date().getHours() + 1))]
    );
    await client.query(
        "INSERT INTO entries (user_id, date, status, source) VALUES ($1, $2::date, 'home', 'email_link');",
        [userId1, today]
    );

    // User2: Sent prompt, NOT responded
    await client.query(
        "INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at) VALUES ($1, 'email', 'daily_prompt', '{}', $2::timestamp);",
        [userId2, new Date()]
    );
    // No CTA token or entry for User2 for today
  });

  afterAll(async () => {
    await client.end();
    await pool.end();
    await container.stop();
  });

  it('should calculate daily notification stats correctly', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const stats = await notificationRepo.getDailyNotificationStats(today);

    expect(stats.total_active_users_notified).toBe('2'); // User1 + User2
    expect(stats.total_sent_prompts).toBe('2'); // One for each user
    expect(stats.total_users_responded).toBe('1'); // Only User1 responded
    expect(stats.total_cta_used).toBe('1');
    expect(stats.users_without_entry).toBe('1'); // Only User2 has no entry
  });
});
