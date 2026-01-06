import { FastifyInstance } from 'fastify';
import { NotificationController } from './notification.controller';

async function notificationRoutes(
  server: FastifyInstance,
  options: { notificationController: NotificationController }
) {
  const { notificationController } = options;
  // Get notification statistics for a given date
  server.get(
    '/admin/notifications/stats',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    notificationController.getNotificationStatsHandler as any
  );

  // Get notification logs for a given date
  server.get(
    '/admin/notifications/logs',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    notificationController.getNotificationLogsHandler as any
  );

  // Note: Use POST /admin/trigger-daily-emails with onlyPending=true to resend to pending users
}

export default notificationRoutes;
