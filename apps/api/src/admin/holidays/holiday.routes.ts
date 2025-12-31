import { FastifyInstance } from 'fastify';
import { HolidayController } from './holiday.controller';

export default async function holidayRoutes(fastify: FastifyInstance, options: { controller: HolidayController }) {
  const { controller } = options;

  fastify.get(
    '/admin/holidays',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
    },
    controller.getHolidays.bind(controller) as any
  );

  fastify.post(
    '/admin/holidays',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
    },
    controller.addHoliday.bind(controller) as any
  );

  fastify.delete(
    '/admin/holidays/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize('hr')],
    },
    controller.deleteHoliday.bind(controller) as any
  );
}
