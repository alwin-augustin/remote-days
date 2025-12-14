import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import db from './db';
import authRoutes from './auth/auth.routes';
import adminRoutes from './admin/admin.routes';
import ctaRoutes from './cta/cta.routes';
import hrRoutes from './hr/hr.routes';
import entriesRoutes from './entries/entries.routes';
import notificationRoutes from './admin/notifications/notification.routes';
import auditRoutes from './admin/audit.routes';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth';

import { globalErrorHandler } from './errors/global-error-handler';

export function build(opts: FastifyServerOptions = {}, dbOptions: { connectionString?: string } = {}): FastifyInstance {
  const server = fastify(opts);

  server.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://teletravail-tracker-web.onrender.com',
      'https://teletravail-tracker-web.vercel.app',
      process.env.APP_URL || ''
    ].filter(Boolean),
    credentials: true,
  });
  server.register(cookie);
  server.register(require('@fastify/multipart'), {
    addToBody: true, // simplified handling for small files
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100,     // Max field value size in bytes
      fields: 10,         // Max number of non-file fields
      fileSize: 5000000,  // For multipart forms, the max file size in bytes
      files: 1,           // Max number of file fields
      headerPairs: 2000   // Max number of header key=>value pairs
    }
  });

  // Register DB with potential override
  server.register(db, dbOptions);


  server.register(authPlugin);

  // Global Error Handler
  server.setErrorHandler(globalErrorHandler);

  server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  // Routes



  // Wiring Entries Module
  server.register(async (instance) => {
    // Wait for DB plugin to be registered to access the pool
    // Actually db plugin is registered above, so instance.pg should be available if we await
    // However, fastify plugins run after strict boot.
    // The "diPlugin" already creates instances. We can either reuse them or create new ones.
    // To respect the "Pilot" mode and not duplicate logic excessively, let's instantiate them here
    // or better, inside the register block to ensure `instance.pg` is available.

    // BUT, server.pg might not be available at the top level definition time of `build`.
    // We should do this inside the register callback or a separate plugin.
    // Since we are inside `build`, `server.register` is correct.

    // Let's create a small inline plugin or just register it.
    // Note: fastify-postgres attaches `pg` to the instance.
    // We need to ensure `diPlugin` or connection is ready.
  });

  // Re-approach: We need the pool. `server.pg` is available after `server.register(db)`?
  // No, `server.pg` is available inside plugins. 

  // Let's wrap the wiring in a plugin function to be safe.
  server.register(async (apiScope) => {
    const pool = apiScope.pg.pool;

    // Manual DI
    const { EntryRepository } = await import('./repositories/entry.repository');
    const { EntryService } = await import('./services/entry.service');
    const { EntriesController } = await import('./entries/entries.controller');

    const entryRepo = new EntryRepository(pool);
    // Audit Module - Instantiated early for dependency injection
    const { AuditRepository } = await import('./repositories/audit.repository');
    const auditRepo = new AuditRepository(pool);

    const entryService = new EntryService(entryRepo, auditRepo);
    const entriesController = new EntriesController(entryService);

    apiScope.register(entriesRoutes, { prefix: '/api', controller: entriesController });

    // Register other routes that don't need manual DI yet
    // apiScope.register(authRoutes, { prefix: '/api' }); // Moved to manual DI

    // Auth Wiring
    const { UserRepository } = await import('./repositories/user.repository');
    const { TokenRepository } = await import('./repositories/token.repository');
    const { UserService } = await import('./services/user.service');
    const { AuthService } = await import('./services/auth.service');
    const { EmailService } = await import('./services/email.service');
    const { AuthController } = await import('./auth/auth.controller');

    // Repos
    const userRepo = new UserRepository(pool);
    const tokenRepo = new TokenRepository(pool);

    // Services
    // Note: EmailService might need deps or just be class. It is simple class in di.ts.
    const emailService = new EmailService();
    const userService = new UserService(userRepo, tokenRepo, emailService);
    const authService = new AuthService(userRepo, tokenRepo, emailService);

    // Admin / Country
    const { CountryRepository } = await import('./repositories/country.repository');
    const { CountryService } = await import('./services/country.service');
    const { AdminController } = await import('./admin/admin.controller');
    const { CountryController } = await import('./admin/country.controller');

    const countryRepo = new CountryRepository(pool);
    const countryService = new CountryService(countryRepo);

    const adminController = new AdminController(userService); // Admin uses User service
    const countryController = new CountryController(countryService);

    // HR Module
    const { HRRepository } = await import('./repositories/hr.repository');
    const { HRService } = await import('./services/hr.service');
    const { HRController } = await import('./hr/hr.controller');

    const hrRepo = new HRRepository(pool);
    const hrService = new HRService(hrRepo);
    const hrController = new HRController(hrService);

    // CTA Module
    const { CtaService } = await import('./services/cta.service');
    const { CtaController } = await import('./cta/cta.controller');

    // ctaService needs tokenRepo and entryRepo
    // We have entryRepository defined here via DI plugin? Or previous code?
    // Let's ensure I can access `entryRepo`.
    // It is defined in the block.
    // Also `tokenRepo`. It is defined in Auth section.
    // Wait, `tokenRepo` is defined as `const tokenRepo = new TokenRepository(pool);`?
    // Let's check `app.ts` content for `tokenRepo`.
    // In step 227 summary, it said "created a new token repository...".
    // In `app.ts` view in step 235 (I verified wiring auth): `const tokenRepo = new TokenRepository(pool);`

    const ctaService = new CtaService(tokenRepo, entryRepo);
    const ctaController = new CtaController(ctaService);

    // Notification Module
    const { NotificationRepository } = await import('./repositories/notification.repository');
    const { NotificationService } = await import('./services/notification.service');
    const { NotificationController } = await import('./admin/notifications/notification.controller');

    const notificationRepo = new NotificationRepository(pool);
    const notificationService = new NotificationService(notificationRepo, emailService);
    const notificationController = new NotificationController(notificationService);

    // Audit Module
    const { AuditService } = await import('./services/audit.service');
    const { AuditController } = await import('./admin/audit.controller');

    // auditRepo already instantiated above
    const auditService = new AuditService(auditRepo);
    const auditController = new AuditController(auditService);

    // Controllers
    const authController = new AuthController(authService);

    apiScope.register(authRoutes, { prefix: '/api', controller: authController });
    apiScope.register(adminRoutes, {
      prefix: '/api',
      adminController,
      countryController
    });
    apiScope.register(hrRoutes, { prefix: '/api', hrController });
    apiScope.register(ctaRoutes, { prefix: '/api', ctaController });

    apiScope.register(notificationRoutes, { prefix: '/api', notificationController });
    apiScope.register(auditRoutes, { prefix: '/api', auditController });


  });


  server.get('/', async () => {
    return { hello: 'world' };
  });

  server.get('/debug-user', async () => {
    try {
      const res = await server.pg.query("SELECT * FROM users WHERE email = 'admin@example.com'");
      if (res.rows.length === 0) return { status: 'User Not Found' };
      return { status: 'User Found', role: res.rows[0].role, hash: res.rows[0].password_hash.substring(0, 10) + '...' };
    } catch (err: any) {
      return { status: 'DB Error', error: err.message };
    }
  });

  return server;
}
