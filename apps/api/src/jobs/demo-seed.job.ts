/**
 * Nightly demo-seed job.
 *
 * Runs the demo seeder on a cron schedule (default: 00:00 Europe/Paris) so the
 * demo environment always presents current-year, internally consistent data.
 *
 * Safety:
 *  - Disabled by default in production; enable with DEMO_SEED_ENABLED=true.
 *  - A module-level guard prevents overlapping runs (node-cron v3 has no
 *    built-in overlap protection), and the seeder itself takes a Postgres
 *    advisory lock so two instances cannot interleave.
 */
import cron from 'node-cron';
import { Pool } from 'pg';
import { config } from '../config/env';
import { seedDemoData } from '../scripts/seed-demo';

export interface JobLogger {
  info: (context: Record<string, unknown>, message: string) => void;
  warn: (context: Record<string, unknown>, message: string) => void;
  error: (context: Record<string, unknown>, message: string) => void;
}

let isRunning = false;

/** Run the seed once. Exported so it can be triggered manually or in tests. */
export async function runDemoSeed(logger: JobLogger): Promise<void> {
  if (isRunning) {
    logger.warn({}, 'demo seed skipped — previous run still in progress');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  const pool = new Pool({ connectionString: config.DATABASE_URL });

  try {
    logger.info({}, 'demo seed started');
    const summary = await seedDemoData(pool, {
      randomSeed: config.DEMO_SEED_RANDOM_SEED,
      log: (message) => logger.info({}, message),
    });
    logger.info({ summary, durationMs: Date.now() - startedAt }, 'demo seed finished');
  } catch (error) {
    logger.error({ error, durationMs: Date.now() - startedAt }, 'demo seed failed');
    throw error;
  } finally {
    await pool.end().catch(() => undefined);
    isRunning = false;
  }
}

/**
 * Register the nightly job. Returns the scheduled task, or null when the job is
 * disabled or the cron expression is invalid.
 */
export function startDemoSeedCron(logger: JobLogger): ReturnType<typeof cron.schedule> | null {
  if (!config.DEMO_SEED_ENABLED) {
    logger.info({}, 'demo seed cron disabled (set DEMO_SEED_ENABLED=true to enable)');
    return null;
  }

  if (!cron.validate(config.DEMO_SEED_CRON)) {
    logger.error({ expression: config.DEMO_SEED_CRON }, 'invalid DEMO_SEED_CRON expression — cron not started');
    return null;
  }

  const task = cron.schedule(
    config.DEMO_SEED_CRON,
    () => {
      void runDemoSeed(logger).catch(() => undefined);
    },
    { timezone: config.DEMO_SEED_TIMEZONE }
  );

  logger.warn(
    { schedule: config.DEMO_SEED_CRON, timezone: config.DEMO_SEED_TIMEZONE },
    'demo seed cron scheduled — this wipes and regenerates all demo data'
  );

  return task;
}
