import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminController } from './admin.controller';
import { CountryController } from './country.controller';
import { sendEmailPrompts } from '../worker/worker';

async function adminRoutes(
  server: FastifyInstance,
  options: {
    adminController: AdminController;
    countryController: CountryController;
  }
) {
  const { adminController, countryController } = options;

  // Trigger daily email worker manually (Admin/HR)
  server.post(
    '/admin/trigger-daily-emails',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
      schema: {
        description: 'Manually trigger the daily email reminder worker. Use onlyPending=true to only send to users who haven\'t declared yet.',
        tags: ['Admin'],
        body: {
          type: 'object',
          properties: {
            onlyPending: {
              type: 'boolean',
              description: 'If true, only send to users who haven\'t declared their status today',
              default: false,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  totalUsers: { type: 'number' },
                  sentCount: { type: 'number' },
                  skippedCount: { type: 'number' },
                  date: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { onlyPending?: boolean } | undefined;
      const { onlyPending = false } = body || {};

      request.log.info(`Admin triggered daily email worker (onlyPending: ${onlyPending})`);

      try {
        const result = await sendEmailPrompts(server, { onlyPending });

        const mode = onlyPending ? 'pending users only' : 'all users';
        reply.code(200).send({
          success: true,
          message: `Sent ${result.sentCount} emails (${mode}). Check Mailpit at http://localhost:8025 to see the emails.`,
          data: result,
        });
      } catch (error: any) {
        request.log.error(error, 'Failed to send daily email prompts');
        reply.code(500).send({
          success: false,
          message: `Failed to send emails: ${error.message}`,
        });
      }
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
