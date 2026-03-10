import { FastifyInstance } from 'fastify';
import { EntriesController } from './entries.controller';
import { CreateEntryBody, EntriesQuerystring, OverrideEntryBody, OverrideEntryParams } from '../schemas';

async function entriesRoutes(server: FastifyInstance, options: { controller: EntriesController }) {
  server.addHook('preHandler', server.authenticate);

  const { controller } = options;

  server.post('/entries', { schema: { body: CreateEntryBody } }, controller.createEntryHandler);
  server.get('/entries', { schema: { querystring: EntriesQuerystring } }, controller.getEntriesHandler);

  // Override as resource: PATCH /entries/:userId/:date — HR/admin only
  server.patch(
    '/entries/:userId/:date',
    {
      preHandler: [server.authorize('hr')],
      schema: { body: OverrideEntryBody, params: OverrideEntryParams },
    },
    controller.overrideEntryHandler
  );

  // Compliance stats: GET /users/me/compliance (replaces GET /entries/stats)
  server.get('/users/me/compliance', controller.getStatsHandler);
}

export default entriesRoutes;
