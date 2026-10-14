import { FastifyInstance } from 'fastify';
import { HRController } from './hr.controller';

async function hrRoutes(server: FastifyInstance, options: { hrController: HRController }) {
  const { hrController } = options;

  // Employee compliance summaries (replaces /hr/summary)
  server.get(
    '/employees/summary',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.getEmployeeSummaryHandler as any
  );

  // Employee entries by month (replaces /hr/entries)
  server.get(
    '/employees/entries',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.getEmployeeEntriesHandler as any
  );

  // Daily stats (replaces /hr/stats/daily)
  server.get(
    '/employees/stats/daily',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.getDailyStatsHandler as any
  );

  // Daily entries (replaces /hr/entries/daily)
  server.get(
    '/employees/entries/daily',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.getDailyEntriesHandler as any
  );

  // Risk stats (replaces /hr/stats/risk)
  server.get(
    '/employees/stats/risk',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.getRiskStatsHandler as any
  );

  // PATCH replaces PUT (T-018); resource path under /employees (T-019)
  server.patch(
    '/employees/entries/:id',
    { preHandler: [server.authenticate, server.authorize('hr')] },
    hrController.updateEntryHandler as any
  );
}

export default hrRoutes;
