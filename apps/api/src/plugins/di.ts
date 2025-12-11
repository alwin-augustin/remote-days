import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { UserRepository } from '../repositories/user.repository';
import { EntryRepository } from '../repositories/entry.repository';
import { HRRepository } from '../repositories/hr.repository';
import { UserService } from '../services/user.service';
import { EntryService } from '../services/entry.service';
import { HRService } from '../services/hr.service';
import { CountryRepository } from '../repositories/country.repository';
import { CountryService } from '../services/country.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { AuditRepository } from '../repositories/audit.repository';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';

declare module 'fastify' {
  interface FastifyInstance {
    services: {
      user: UserService;
      entry: EntryService;
      hr: HRService;
      country: CountryService;
      notification: NotificationService;
      audit: AuditService;
      email: EmailService;
    };
  }
}

const diPlugin: FastifyPluginAsync = async (server) => {
  const { pool } = server.pg;

  const userRepo = new UserRepository(pool);
  const userService = new UserService(userRepo);

  const entryRepo = new EntryRepository(pool);
  const entryService = new EntryService(entryRepo);

  const hrRepo = new HRRepository(pool);
  const hrService = new HRService(hrRepo);

  const countryRepo = new CountryRepository(pool);
  const countryService = new CountryService(countryRepo);

  const emailService = new EmailService(); // Moved instantiation of emailService before notificationService

  const notificationRepo = new NotificationRepository(pool);
  const notificationService = new NotificationService(notificationRepo, emailService); // Injected emailService

  const auditRepo = new AuditRepository(pool);
  const auditService = new AuditService(auditRepo);

  server.decorate('services', {
    user: userService,
    entry: entryService,
    hr: hrService,
    country: countryService,
    notification: notificationService,
    audit: auditService,
    email: emailService,
  });
};

export default fp(diPlugin);
