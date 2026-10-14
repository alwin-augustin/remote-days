import dotenv from 'dotenv';
import path from 'path';

// Load env BEFORE other imports
const envPath = '/Users/alwinaugustin/Desktop/Projets/teletravail-tracker/apps/api/.env';
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

// Hardcode fallbacks for local dev if .env is missing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://admin:password@localhost:5432/tracker';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
process.env.PORT = process.env.PORT || '3000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

// Now import config, which validates env vars
import { config } from '../src/config/env';

import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import { sendEmailPrompts } from '../src/worker/worker';

async function main() {
  console.log('--- Triggering Daily Prompt Worker ---');
  console.log(`SMTP Config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);

  const fastify = Fastify({ logger: true });

  // Register Postgres
  fastify.register(fastifyPostgres, {
    connectionString: config.DATABASE_URL,
  });

  await fastify.ready();
  console.log('Database connected.');

  try {
    await sendEmailPrompts(fastify);
    console.log('--- Worker Completed Successfully ---');
  } catch (err) {
    console.error('Worker failed:', err);
  } finally {
    await fastify.close();
    process.exit(0);
  }
}

main().catch(console.error);
