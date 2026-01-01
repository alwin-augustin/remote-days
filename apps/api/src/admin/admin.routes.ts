import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminController } from './admin.controller';
import { CountryController } from './country.controller';
import { emailJobManager } from '../worker/email-job.manager';

async function adminRoutes(
  server: FastifyInstance,
  options: {
    adminController: AdminController;
    countryController: CountryController;
  }
) {
  const { adminController, countryController } = options;

  // Trigger daily email worker manually (Admin/HR) - Asynchronous Job
  server.post(
    '/admin/trigger-daily-emails',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
      schema: {
        description: 'Manually trigger the daily email reminder worker. Returns a job ID immediately.',
        tags: ['Admin'],
        body: {
          type: 'object',
          properties: {
            onlyPending: { type: 'boolean', default: false },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              jobId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { onlyPending?: boolean } | undefined;
      const { onlyPending = false } = body || {};

      request.log.info(`Admin triggering daily email job (onlyPending: ${onlyPending})`);

      const job = emailJobManager.startJob(server, { onlyPending });

      reply.code(200).send({
        success: true,
        message: 'Email sending scheduled. Track progress using the job ID.',
        jobId: job.id,
      });
    }
  );

  // Get Email Job Status
  server.get<{ Params: { id: string } }>(
    '/admin/email-jobs/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
      schema: {
        description: 'Get the status of an email sending job',
        tags: ['Admin'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const job = emailJobManager.getJob(id);

      if (!job) {
        return reply.code(404).send({ message: 'Job not found' });
      }

      reply.code(200).send(job);
    }
  );

  // User Import
  server.post(
    '/admin/users/import',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.importUsersHandler as any
  );

  // User Management
  server.post(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.createUserHandler as any
  );

  server.get(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.getUsersHandler as any
  );

  server.put(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.updateUserHandler as any
  );

  server.delete(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.deleteUserHandler as any
  );

  // Country Management
  server.get(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.getCountriesHandler as any
  );

  server.post(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.createCountryHandler as any
  );

  server.put(
    '/admin/countries/:code',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.updateCountryHandler as any
  );
}

export default adminRoutes;
