import fastify, {
  FastifyInstance,
  FastifyBaseLogger,
  FastifyServerOptions,
  RawServerDefault,
} from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';
import db from './db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import * as fs from 'fs';
import * as path from 'path';
import authPlugin from './plugins/auth';
import apiRoutes from './api-routes';

import { globalErrorHandler } from './errors/global-error-handler';
import { keysToCamelCase } from './utils/camel-case';

/**
 * Directory holding the built SPA.
 *
 * `__dirname` is `apps/api/dist` for the bundled server and `apps/api/src` under
 * ts-node, and `../../web/dist` resolves to `apps/web/dist` from both — so one
 * default covers local development and the production image alike. Override with
 * `WEB_DIST_PATH` if the bundle is ever placed somewhere else.
 */
const WEB_DIST_PATH = process.env.WEB_DIST_PATH || path.resolve(__dirname, '../../web/dist');

/**
 * The instance `build` hands back.
 *
 * Written out rather than left as a bare `FastifyInstance` because the server is
 * created with the TypeBox schema provider, and `FastifyInstance` on its own
 * means the *default* provider — a different, unrelated type. Every caller that
 * wants the schema types inferred from its TypeBox schemas needs this one.
 */
export type AppInstance = FastifyInstance<
  RawServerDefault,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export function build(opts: FastifyServerOptions = {}, dbOptions: { connectionString?: string } = {}): AppInstance {
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

  // Default Cache-Control for all API GET responses: no caching of sensitive data.
  // Scoped to the API surface on purpose — the SPA bundle is served from this
  // same origin and sets its own long-lived cache headers in the static plugin.
  server.addHook('onSend', async (request, reply) => {
    const isApiResponse = request.url.startsWith('/v1') || request.url === '/health';
    if (isApiResponse && request.method === 'GET' && !reply.hasHeader('Cache-Control')) {
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

  // ------------------------------------------------------------ SPA hosting
  // The API also serves the single-page app, which is what makes the browser
  // talk to it without CORS and keeps the session cookie first-party. When the
  // bundle is absent — the test suite, or running the API on its own — the
  // routes below stay exactly as they were.
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(path.join(WEB_DIST_PATH, 'index.html'))) {
    server.register(fastifyStatic, {
      root: WEB_DIST_PATH,
      prefix: '/',
      // Both of these are off deliberately. We register `GET /` ourselves, and
      // leaving the catch-all off keeps the not-found handler below in charge, so
      // an unknown /v1 path still answers with JSON instead of the SPA shell.
      index: false,
      wildcard: false,
      // Cache policy is decided per file in setHeaders instead.
      cacheControl: false,
      setHeaders: (res: any, filePath: string) => {
        const relative = path.relative(WEB_DIST_PATH, filePath).split(path.sep).join('/');

        if (relative.startsWith('assets/')) {
          // Vite fingerprints these filenames, so a given URL never changes.
          res.setHeader('cache-control', 'public, max-age=31536000, immutable');
        } else if (relative === 'index.html' || relative === 'sw.js' || relative === 'registerSW.js') {
          // The shell and the service worker must be revalidated, otherwise a
          // deploy would not reach anyone who already has the old bundle.
          res.setHeader('cache-control', 'no-cache');
        } else {
          res.setHeader('cache-control', 'public, max-age=86400');
        }
      },
    });

    server.get('/', (request, reply) => reply.sendFile('index.html'));

    server.setNotFoundHandler((request, reply) => {
      const acceptsHtml = String(request.headers.accept || '').includes('text/html');

      // A hard refresh on a client-side route (/hr/employees) is a browser
      // navigation, which is the only case that should get the shell back.
      if (request.method === 'GET' && acceptsHtml && !request.url.startsWith('/v1')) {
        return reply.sendFile('index.html');
      }

      // Byte-for-byte the shape Fastify replies with by default, so API clients
      // see no change now that this handler exists.
      return reply.code(404).send({
        message: `Route ${request.method}:${request.url} not found`,
        error: 'Not Found',
        statusCode: 404,
      });
    });
  } else {
    server.get('/', async () => {
      return { hello: 'world' };
    });
  }

  return server;
}
