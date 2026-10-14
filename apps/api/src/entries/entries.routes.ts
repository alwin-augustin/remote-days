import { EntriesController } from './entries.controller';
import { CreateEntryBody, EntriesQuerystring, OverrideEntryBody, OverrideEntryParams } from '../schemas';
// Type-only, so this does not create a runtime import cycle with app.ts.
import type { AppInstance } from '../app';

async function entriesRoutes(server: AppInstance, options: { controller: EntriesController }) {
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
    // Cast matches every other route file here (hr, admin, sso, requests, …).
    // The `preHandler` array stops TypeScript resolving the schema-aware route
    // overload, so the request would come through as the default generic instead
    // of the schema's types. Compile-time only: Fastify still validates the body
    // and params against the TypeBox schemas at runtime.
    controller.overrideEntryHandler as any
  );

  // Compliance stats: GET /users/me/compliance (replaces GET /entries/stats)
  server.get('/users/me/compliance', controller.getStatsHandler);
}

export default entriesRoutes;
