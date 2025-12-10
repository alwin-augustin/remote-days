import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { config } from './config/env';

async function dbConnector(fastify: FastifyInstance, options: { connectionString?: string }) {
  fastify.register(fastifyPostgres, {
    connectionString: options.connectionString || config.DATABASE_URL,
  });
}

export default fp(dbConnector);
