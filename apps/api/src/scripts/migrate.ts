/**
 * Database Migration Runner
 *
 * Runs SQL migrations from the migrations directory in order.
 * Tracks applied migrations in a schema_migrations table.
 *
 * Usage:
 *   npm run db:migrate                 # Run all pending migrations
 *   npm run db:migrate:status          # Show migration status
 *   npm run db:migrate:rollback        # Rollback last migration (if down file exists)
 *
 * Bookkeeping note: `schema_migrations` is created by docker/postgres/init.sql as
 * (id SERIAL, name TEXT, applied_at TIMESTAMPTZ), and the migration files
 * themselves record their own `name` (e.g. '002_security_tables'). This runner
 * keys off that same `name` value — the filename without the `.sql` suffix — so
 * it stays consistent with both the bootstrap schema and the migration files.
 */
import * as fs from 'fs';
import * as path from 'path';
import fastify from 'fastify';
import db from '../db';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface AppliedMigration {
  name: string;
  applied_at?: Date;
}

interface MigrationFile {
  /** Stable key recorded in schema_migrations, e.g. "004_enterprise_sso". */
  key: string;
  filename: string;
  filepath: string;
}

async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Makes both this runner's bookkeeping and a migration file's own
  // `INSERT ... ON CONFLICT DO NOTHING` idempotent.
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_migrations_name
      ON schema_migrations (name);
  `);
}

async function getAppliedMigrations(client: any): Promise<Set<string>> {
  const { rows } = await client.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((row: AppliedMigration) => row.name));
}

function getMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found at:', MIGRATIONS_DIR);
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.includes('.down.'))
    .sort();

  return files.map((filename) => {
    // Expect "001_description.sql" so migrations have a deterministic order.
    if (!/^\d+/.test(filename)) {
      throw new Error(`Invalid migration filename format: ${filename}. Expected format: 001_description.sql`);
    }
    return {
      key: filename.replace(/\.sql$/, ''),
      filename,
      filepath: path.join(MIGRATIONS_DIR, filename),
    };
  });
}

async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('📭 No migration files found.');
      return;
    }

    const pendingMigrations = migrationFiles.filter((m) => !appliedMigrations.has(m.key));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are already applied.');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migration(s):\n`);

    for (const migration of pendingMigrations) {
      console.log(`⏳ Running migration: ${migration.filename}`);

      const sql = fs.readFileSync(migration.filepath, 'utf-8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        // ON CONFLICT keeps this safe when a migration file also records itself.
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [
          migration.key,
        ]);
        await client.query('COMMIT');
        console.log(`✅ Applied: ${migration.filename}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${migration.filename}`);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } finally {
    client.release();
    await server.close();
  }
}

async function showStatus(): Promise<void> {
  console.log('📊 Migration Status\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('');

  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();

  try {
    await ensureMigrationsTable(client);
    const { rows: appliedRows } = await client.query<AppliedMigration>(
      'SELECT name, applied_at FROM schema_migrations ORDER BY name'
    );
    const migrationFiles = getMigrationFiles();

    console.log('Migration                      | Status   | Applied At');
    console.log('-------------------------------|----------|---------------------------');

    for (const file of migrationFiles) {
      const applied = appliedRows.find((r) => r.name === file.key);
      const status = applied ? '✅ Applied' : '⏳ Pending';
      const appliedAt = applied?.applied_at
        ? new Date(applied.applied_at).toISOString().replace('T', ' ').slice(0, 19)
        : '-';
      console.log(`${file.key.padEnd(30)} | ${status.padEnd(8)} | ${appliedAt}`);
    }

    // Check for orphaned migrations (recorded in DB but no file on disk)
    const orphaned = appliedRows.filter((r) => !migrationFiles.find((f) => f.key === r.name));
    if (orphaned.length > 0) {
      console.log('\n⚠️  Orphaned migrations (recorded but file missing):');
      orphaned.forEach((m) => console.log(`   - ${m.name}`));
    }

    console.log('');
  } finally {
    client.release();
    await server.close();
  }
}

async function rollback(): Promise<void> {
  console.log('⏪ Rolling back last migration...\n');

  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();

  try {
    await ensureMigrationsTable(client);

    const { rows } = await client.query<AppliedMigration>(
      'SELECT name, applied_at FROM schema_migrations ORDER BY applied_at DESC, id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('📭 No migrations to rollback.');
      return;
    }

    const lastMigration = rows[0];
    const downFilename = `${lastMigration.name}.down.sql`;
    const downFilepath = path.join(MIGRATIONS_DIR, downFilename);

    if (!fs.existsSync(downFilepath)) {
      console.error(`❌ No rollback file found: ${downFilename}`);
      console.log('   Create a down migration file to enable rollback.');
      process.exit(1);
    }

    console.log(`⏳ Rolling back: ${lastMigration.name}`);

    const sql = fs.readFileSync(downFilepath, 'utf-8');

    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE name = $1', [lastMigration.name]);
      await client.query('COMMIT');
      console.log(`✅ Rolled back: ${lastMigration.name}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback failed: ${lastMigration.name}`);
      throw error;
    }
  } finally {
    client.release();
    await server.close();
  }
}

// CLI handling
//
// The npm scripts invoke this as
//   ts-node -r dotenv/config src/scripts/migrate.ts dotenv_config_path=../../.env [command]
// so the sub-command is not necessarily argv[2] — scan the arguments instead of
// reading a fixed position, otherwise `status`/`rollback` silently run migrations.
const cliArgs = process.argv.slice(2);
const command = (['status', 'rollback'] as const).find((candidate) => cliArgs.includes(candidate));

(async () => {
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'rollback':
        await rollback();
        break;
      default:
        await runMigrations();
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  }
})();
