import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { types } from 'pg';
import { config } from './config/env';

/**
 * A calendar date has no time of day and no timezone, so it must not travel as
 * a timestamp.
 *
 * By default node-postgres parses a `date` column (OID 1082) into a JS `Date` at
 * *local* midnight. `JSON.stringify` then renders it in UTC, which is the
 * previous day for every timezone east of Greenwich: the row stored as
 * `2026-10-12` is sent to clients as `2026-10-11T22:00:00.000Z`. Any client that
 * reads the leading `YYYY-MM-DD` therefore renders the wrong day — and, when it
 * compares that against "today", matches nothing at all.
 *
 * Returning the raw string keeps the wire format equal to the stored value, in
 * every timezone, for every endpoint (entries, requests, holidays, exports).
 */
types.setTypeParser(1082, (value: string) => value);

async function dbConnector(fastify: FastifyInstance, options: { connectionString?: string }) {
  fastify.register(fastifyPostgres, {
    connectionString: options.connectionString || config.DATABASE_URL,
  });
}

export default fp(dbConnector);
