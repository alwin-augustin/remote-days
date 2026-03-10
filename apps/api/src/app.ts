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
import { keysToCamelCase } from './utils/camel-case';

export function build(opts: FastifyServerOptions = {}, dbOptions: { connectionString?: string } = {}): FastifyInstance {
  const server = fastify({
    connectionTimeout: 30000,
    requestTimeout: 30000,
    ...opts,
  }).withTypeProvider<TypeBoxTypeProvider>();

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
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
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
      fieldSize: 1048576, // Max field value size in bytes (1MB)
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

  server.register(apiRoutes, { prefix: '/v1' });

  // Default Cache-Control for all API GET responses: no caching of sensitive data
  server.addHook('onSend', async (request, reply) => {
    if (request.method === 'GET' && !reply.hasHeader('Cache-Control')) {
      // Countries and thresholds are stable — allow 5-min shared cache
      if (request.url.includes('/admin/countries')) {
        reply.header('Cache-Control', 'private, max-age=300');
      } else {
        reply.header('Cache-Control', 'private, no-cache');
      }
    }
  });

  // T-024: Normalize all JSON responses to camelCase keys
  server.addHook('onSend', async (request, reply, payload) => {
    const contentType = reply.getHeader('content-type');
    if (typeof payload === 'string' && typeof contentType === 'string' && contentType.includes('application/json')) {
      try {
        return JSON.stringify(keysToCamelCase(JSON.parse(payload)));
      } catch {
        return payload;
      }
    }
    return payload;
  });

  // T-033: Request/response lifecycle logging
  server.addHook('onResponse', (request, reply, done) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      userId: (request as any).user?.user_id ?? null,
      requestId: request.id,
    }, 'request completed');
    done();
  });

  // T-032: Health check — outside /v1 prefix (infrastructure, not API resource)
  server.get('/health', async (request, reply) => {
    try {
      await server.pg.query('SELECT 1');
      return reply.send({ status: 'ok', db: 'ok', uptime: process.uptime() });
    } catch {
      return reply.code(503).send({ status: 'error', db: 'unreachable', uptime: process.uptime() });
    }
  });

  server.get('/', async () => {
    return { hello: 'world' };
  });

  return server;
}
