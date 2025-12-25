import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { CountryRepository } from '../country.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

describe('CountryRepository Integration', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let countryRepo: CountryRepository;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('tracker_test_country_repo')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    countryRepo = new CountryRepository(pool);

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
    // Countries might be pre-seeded in init.sql or just truncate?
    // Truncating 'country_thresholds' might break FKs if users exist, but in this isolated test, no users exist yet.
    await client.query('TRUNCATE TABLE country_thresholds RESTART IDENTITY CASCADE');
  });

  it('should create and list countries', async () => {
    await countryRepo.create({ country_code: 'US', max_remote_days: 10 });
    await countryRepo.create({ country_code: 'DE', max_remote_days: 20 });

    const all = await countryRepo.findAll();
    expect(all.length).toBe(2);
    expect(all.find((c) => c.country_code === 'US')).toBeDefined();
  });

  it('should update threshold', async () => {
    await countryRepo.create({ country_code: 'FR', max_remote_days: 10 });
    const updated = await countryRepo.update('FR', 15);
    expect(updated?.max_remote_days).toBe(15);
  });
});
