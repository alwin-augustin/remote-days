import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import db from './db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth';
import apiRoutes from './api-routes';

import { globalErrorHandler } from './errors/global-error-handler';

export function build(opts: FastifyServerOptions = {}, dbOptions: { connectionString?: string } = {}): FastifyInstance {
  const server = fastify(opts);

  // Security Headers with Content Security Policy
  server.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'https://api.remotedays.app'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Swagger UI
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for API
  });

  server.register(fastifySwagger, {
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

  server.register(fastifySwaggerUi, {
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
      'https://www.remotedays.app',
      'https://demo.remotedays.app',
      'https://portal.remotedays.app',
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
