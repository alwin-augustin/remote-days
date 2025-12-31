import dotenv from 'dotenv';
import path from 'path';
import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';

// Load env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Fallbacks
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://admin:password@localhost:5432/tracker';

async function main() {
  const fastify = Fastify();
  fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });
  await fastify.ready();

  const { rows } = await fastify.pg.query(
    'SELECT token, user_id, action, target_date FROM email_cta_tokens ORDER BY created_at DESC LIMIT 1'
  );

  if (rows.length > 0) {
    console.log('LATEST_TOKEN:', rows[0].token);
    console.log('DETAILS:', rows[0]);
  } else {
    console.log('No tokens found.');
  }

  await fastify.close();
}

main().catch(console.error);
