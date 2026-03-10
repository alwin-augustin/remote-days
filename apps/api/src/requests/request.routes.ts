import { FastifyInstance } from 'fastify';
import { RequestController } from './request.controller';
import { CreateRequestBody, ProcessRequestBody, RequestIdParam, RequestsQuerystring } from '../schemas';

export default async function requestRoutes(fastify: FastifyInstance, options: { controller: RequestController }) {
  const { controller } = options;

  // Create a new status-change request
  fastify.post(
    '/requests',
    {
      preHandler: [fastify.authenticate],
      schema: { body: CreateRequestBody },
    },
    controller.createRequest.bind(controller) as any
  );

  // GET /requests — role-scoped: employees see own, HR/admin see all
  fastify.get(
    '/requests',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: RequestsQuerystring },
    },
    controller.getRequests.bind(controller) as any
  );

  // PATCH /requests/:id — approve or reject (replaces POST /admin/requests/:id/process)
  fastify.patch(
    '/requests/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
      schema: { body: ProcessRequestBody, params: RequestIdParam },
    },
    controller.processRequest.bind(controller) as any
  );
}
