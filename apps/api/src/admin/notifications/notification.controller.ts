import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from '../../services/notification.service';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  getNotificationStatsHandler = async (
    request: FastifyRequest<{ Querystring: { date?: string } }>,
    reply: FastifyReply
  ) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0]; // Default to today

    try {
      const stats = await this.notificationService.getDailyStats(targetDate);
      reply.code(200).send(stats);
    } catch (err) {
      request.log.error(err, 'Error fetching notification stats');
      reply.code(500).send({ message: 'Error fetching notification stats' });
    }
  };

  resendDailyPromptsHandler = async (request: FastifyRequest<{ Body: { date?: string } }>, reply: FastifyReply) => {
    const targetDate = request.body.date || new Date().toISOString().split('T')[0]; // Default to today

    try {
      const result = await this.notificationService.resendDailyPrompts(targetDate);
      reply.code(200).send({ message: `Resent daily prompts to ${result.notifiedCount} users.`, ...result });
    } catch (err) {
      request.log.error(err, 'Error resending daily prompts');
      reply.code(500).send({ message: 'Error resending daily prompts' });
    }
  };

  getNotificationLogsHandler = async (
    request: FastifyRequest<{ Querystring: { date?: string } }>,
    reply: FastifyReply
  ) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0]; // Default to today

    try {
      const logs = await this.notificationService.getNotificationLogs(targetDate);
      reply.code(200).send(logs);
    } catch (err) {
      request.log.error(err, 'Error fetching notification logs');
      reply.code(500).send({ message: 'Error fetching notification logs' });
    }
  };
}
