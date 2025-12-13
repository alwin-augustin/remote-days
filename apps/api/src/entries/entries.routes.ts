import { FastifyInstance } from 'fastify';
import { EntriesController } from './entries.controller';

async function entriesRoutes(server: FastifyInstance, options: { controller: EntriesController }) {
  server.addHook('preHandler', server.authenticate);

  const { controller } = options;

  server.post('/entries', controller.createEntryHandler);
  server.post('/entries/override', controller.overrideEntryHandler);
  server.get('/entries', controller.getEntriesHandler);
  server.get('/entries/stats', controller.getStatsHandler);
}

export default entriesRoutes;
