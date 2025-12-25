import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import db from './db';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import authPlugin from './plugins/auth';
import apiRoutes from './api-routes';

import { globalErrorHandler } from './errors/global-error-handler';

export function build(opts: FastifyServerOptions = {}, dbOptions: { connectionString?: string } = {}): FastifyInstance {
  const server = fastify(opts);

  server.register(helmet, { global: true }); // Security Headers

  server.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Remote Days API',
        description: 'API for Remote Days - Cross-Border Remote Work Compliance',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local' },
        { url: 'https://api.remotedays.app', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
          },
        },
      },
    },
  });

  server.register(require('@fastify/swagger-ui'), {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  server.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://remotedays.app',
      'https://app.remotedays.app',
      process.env.APP_URL || '',
    ].filter(Boolean),
    credentials: true,
  });
  server.register(cookie);
  server.register(multipart, {
    addToBody: true, // simplified handling for small files
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 5000000, // For multipart forms, the max file size in bytes
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
  } as any);

  server.register(db, dbOptions);

  server.register(authPlugin);

  server.setErrorHandler(globalErrorHandler);

  server.register(rateLimit, {
    max: process.env.NODE_ENV === 'test' ? 1000 : 100,
    timeWindow: '1 minute',
  });

  server.register(apiRoutes);

  server.get('/', async () => {
    return { hello: 'world' };
  });

  return server;
}