import { FastifyInstance } from 'fastify';
import authRoutes from './auth/auth.routes';
import adminRoutes from './admin/admin.routes';
import ctaRoutes from './cta/cta.routes';
import hrRoutes from './hr/hr.routes';
import entriesRoutes from './entries/entries.routes';
import notificationRoutes from './admin/notifications/notification.routes';
import holidayRoutes from './admin/holidays/holiday.routes';
import requestRoutes from './requests/request.routes';
import auditRoutes from './admin/audit.routes';
import pushTokenRoutes from './users/push-token.routes';

import { EntryRepository } from './repositories/entry.repository';
import { EntryService } from './services/entry.service';
import { EntriesController } from './entries/entries.controller';
import { AuditRepository } from './repositories/audit.repository';
import { UserRepository } from './repositories/user.repository';
import { TokenRepository } from './repositories/token.repository';
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { AuthController } from './auth/auth.controller';
import { CountryRepository } from './repositories/country.repository';
import { CountryService } from './services/country.service';
import { AdminController } from './admin/admin.controller';
import { CountryController } from './admin/country.controller';
import { HRRepository } from './repositories/hr.repository';
import { HRService } from './services/hr.service';
import { HRController } from './hr/hr.controller';
import { CtaService } from './services/cta.service';
import { CtaController } from './cta/cta.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './admin/notifications/notification.controller';
import { HolidayRepository } from './repositories/holiday.repository';
import { HolidayService } from './services/holiday.service';
import { HolidayController } from './admin/holidays/holiday.controller';
import { RequestRepository } from './repositories/request.repository';
import { RequestService } from './services/request.service';
import { RequestController } from './requests/request.controller';
import { AuditService } from './services/audit.service';
import { AuditController } from './admin/audit.controller';
import { PushService } from './services/push.service';

export default async function apiRoutes(server: FastifyInstance) {
    if (!server.pg) {
        throw new Error('Database connection not available');
    }
    const pool = server.pg.pool;

    const entryRepo = new EntryRepository(pool);
    const auditRepo = new AuditRepository(pool);
    const userRepo = new UserRepository(pool);
    const tokenRepo = new TokenRepository(pool);
    const countryRepo = new CountryRepository(pool);
    const hrRepo = new HRRepository(pool);
    const notificationRepo = new NotificationRepository(pool);
    const holidayRepo = new HolidayRepository(pool);
    const requestRepo = new RequestRepository(pool);

    const emailService = new EmailService();
    const entryService = new EntryService(entryRepo, auditRepo);
    const userService = new UserService(userRepo, tokenRepo, emailService, entryRepo);
    const authService = new AuthService(userRepo, tokenRepo, emailService);
    const countryService = new CountryService(countryRepo);
    const hrService = new HRService(hrRepo);
    const ctaService = new CtaService(tokenRepo, entryRepo);
    const holidayService = new HolidayService(holidayRepo);
    const notificationService = new NotificationService(notificationRepo, emailService, holidayService);
    const requestService = new RequestService(requestRepo, entryService, auditRepo, userRepo, emailService);
    const auditService = new AuditService(auditRepo);

    // Push notification service - wire up to notification and request services
    const pushService = new PushService(server);
    notificationService.setPushService(pushService);
    requestService.setPushService(pushService);

    const entriesController = new EntriesController(entryService);
    const authController = new AuthController(authService, userService);
    const adminController = new AdminController(userService);
    const countryController = new CountryController(countryService);
    const hrController = new HRController(hrService);
    const ctaController = new CtaController(ctaService);
    const notificationController = new NotificationController(notificationService);
    const holidayController = new HolidayController(holidayService);
    const requestController = new RequestController(requestService);
    const auditController = new AuditController(auditService);

    server.register(entriesRoutes, { prefix: '', controller: entriesController });
    server.register(authRoutes, { prefix: '', controller: authController });
    server.register(adminRoutes, { prefix: '', adminController, countryController });
    server.register(hrRoutes, { prefix: '', hrController });
    server.register(ctaRoutes, { prefix: '', ctaController });
    server.register(notificationRoutes, { prefix: '', notificationController });
    server.register(holidayRoutes, { prefix: '', controller: holidayController });
    server.register(requestRoutes, { prefix: '', controller: requestController });
    server.register(auditRoutes, { prefix: '', auditController });
    server.register(pushTokenRoutes);
}
