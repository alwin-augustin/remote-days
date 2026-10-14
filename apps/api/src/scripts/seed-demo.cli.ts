/**
 * CLI entry point for the demo seeder.
 *
 *   npm run db:seed:demo --workspace=apps/api
 *
 * The seeder logic lives in ./seed-demo.ts so it can also be imported by the
 * nightly scheduler without triggering a run on import.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { seedDemoData } from './seed-demo';

// Works both from the repo root and from apps/api (npm workspace cwd).
['.env', '../../.env'].forEach((path) => dotenv.config({ path }));

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — check your .env file');
  }

  const pool = new Pool({ connectionString });
  try {
    const summary = await seedDemoData(pool, { log: console.log });
    console.log('\nDemo seed succeeded:', JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Demo seed failed:', error);
  process.exitCode = 1;
});
