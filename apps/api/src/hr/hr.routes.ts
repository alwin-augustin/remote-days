import { FastifyInstance } from 'fastify';
import { HRController } from './hr.controller';

async function hrRoutes(server: FastifyInstance, options: { hrController: HRController }) {
  const { hrController } = options;

  server.get(
    '/hr/summary',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.getEmployeeSummaryHandler as any
  );

  server.get(
    '/hr/entries',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.getEmployeeEntriesHandler as any
  );

  server.get(
    '/hr/stats/daily',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.getDailyStatsHandler as any
  );

  server.get(
    '/hr/entries/daily',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.getDailyEntriesHandler as any
  );

  server.get(
    '/hr/stats/risk',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.getRiskStatsHandler as any
  );

  server.put(
    '/hr/entries/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    hrController.updateEntryHandler as any
  );
}

export default hrRoutes;
