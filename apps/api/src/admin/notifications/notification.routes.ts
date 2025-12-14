import { FastifyInstance } from 'fastify';
import { NotificationController } from './notification.controller';

async function notificationRoutes(
  server: FastifyInstance,
  options: { notificationController: NotificationController }
) {
  const { notificationController } = options;
  server.get(
    '/admin/notifications/stats',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    notificationController.getNotificationStatsHandler as any
  );

  server.post(
    '/admin/notifications/resend',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    notificationController.resendDailyPromptsHandler as any
  );

  server.get(
    '/admin/notifications/logs',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    notificationController.getNotificationLogsHandler as any
  );
}

export default notificationRoutes;
