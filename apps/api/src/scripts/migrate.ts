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
 */

import * as fs from 'fs';
import * as path from 'path';
import fastify from 'fastify';
import db from '../db';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface Migration {
  id: string;
  filename: string;
  applied_at?: Date;
}

async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client: any): Promise<Set<string>> {
  const { rows } = await client.query('SELECT id FROM schema_migrations ORDER BY id');
  return new Set(rows.map((row: { id: string }) => row.id));
}

function getMigrationFiles(): { id: string; filename: string; filepath: string }[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found at:', MIGRATIONS_DIR);
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.includes('.down.'))
    .sort();

  return files.map((filename) => {
    // Extract migration ID from filename (e.g., "001_create_table.sql" -> "001")
    const match = filename.match(/^(\d+)/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}. Expected format: 001_description.sql`);
    }
    return {
      id: match[1],
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

    const pendingMigrations = migrationFiles.filter((m) => !appliedMigrations.has(m.id));

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
        await client.query('INSERT INTO schema_migrations (id, filename) VALUES ($1, $2)', [
          migration.id,
          migration.filename,
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
    const { rows: appliedRows } = await client.query<Migration>(
      'SELECT id, filename, applied_at FROM schema_migrations ORDER BY id'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.id));
    const migrationFiles = getMigrationFiles();

    console.log('Migrations:\n');
    console.log('ID     | Status   | Filename                          | Applied At');
    console.log('-------|----------|-----------------------------------|---------------------------');

    for (const file of migrationFiles) {
      const applied = appliedRows.find((r) => r.id === file.id);
      const status = applied ? '✅ Applied' : '⏳ Pending';
      const appliedAt = applied?.applied_at
        ? new Date(applied.applied_at).toISOString().replace('T', ' ').slice(0, 19)
        : '-';
      console.log(`${file.id.padEnd(6)} | ${status.padEnd(8)} | ${file.filename.padEnd(33)} | ${appliedAt}`);
    }

    // Check for orphaned migrations (in DB but file missing)
    const orphaned = appliedRows.filter((r) => !migrationFiles.find((f) => f.id === r.id));
    if (orphaned.length > 0) {
      console.log('\n⚠️  Orphaned migrations (in DB but file missing):');
      orphaned.forEach((m) => console.log(`   - ${m.id}: ${m.filename}`));
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

    const { rows } = await client.query<Migration>(
      'SELECT id, filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('📭 No migrations to rollback.');
      return;
    }

    const lastMigration = rows[0];
    const downFilename = lastMigration.filename.replace('.sql', '.down.sql');
    const downFilepath = path.join(MIGRATIONS_DIR, downFilename);

    if (!fs.existsSync(downFilepath)) {
      console.error(`❌ No rollback file found: ${downFilename}`);
      console.log('   Create a down migration file to enable rollback.');
      process.exit(1);
    }

    console.log(`⏳ Rolling back: ${lastMigration.filename}`);

    const sql = fs.readFileSync(downFilepath, 'utf-8');

    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE id = $1', [lastMigration.id]);
      await client.query('COMMIT');
      console.log(`✅ Rolled back: ${lastMigration.filename}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback failed: ${lastMigration.filename}`);
      throw error;
    }
  } finally {
    client.release();
    await server.close();
  }
}

// CLI handling
const command = process.argv[2];

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
