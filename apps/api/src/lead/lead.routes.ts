import { FastifyInstance } from 'fastify';
import { LeadController } from './lead.controller';
import { CreateLeadSchema } from '../schemas/lead.schema';

export default async function leadRoutes(server: FastifyInstance, options: { controller: LeadController }) {
  server.post(
    '/leads',
    {
      schema: {
        body: CreateLeadSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    options.controller.create.bind(options.controller)
  );
}
