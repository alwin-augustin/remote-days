import { FastifyInstance } from 'fastify';
import { RequestController } from './request.controller';

export default async function requestRoutes(fastify: FastifyInstance, options: { controller: RequestController }) {
  const { controller } = options;

  // Employee Routes
  fastify.post(
    '/requests',
    {
      preHandler: [fastify.authenticate],
    },
    controller.createRequest.bind(controller) as any
  );

  fastify.get(
    '/requests/me',
    {
      preHandler: [fastify.authenticate],
    },
    controller.getMyRequests.bind(controller) as any
  );

  // Admin/HR Routes
  fastify.get(
    '/admin/requests',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
    },
    controller.getAllRequests.bind(controller) as any
  );

  fastify.post(
    '/admin/requests/:id/process',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
    },
    controller.processRequest.bind(controller) as any
  );
}
