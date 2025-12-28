import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PushService } from '../services/push.service';

interface RegisterTokenBody {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}

async function pushTokenRoutes(server: FastifyInstance) {
  const pushService = new PushService(server);

  // Register push token
  server.post<{ Body: RegisterTokenBody }>(
    '/users/push-token',
    {
      preHandler: [server.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['token', 'platform'],
          properties: {
            token: { type: 'string', minLength: 1 },
            platform: { type: 'string', enum: ['ios', 'android', 'web'] },
            deviceName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RegisterTokenBody }>, reply: FastifyReply) => {
      const { token, platform, deviceName } = request.body;
      const userId = request.user.user_id;

      await pushService.registerToken(userId, token, platform, deviceName);

      reply.send({ message: 'Push token registered successfully' });
    }
  );

  // Unregister push token (for logout)
  server.delete(
    '/users/push-token',
    {
      preHandler: [server.authenticate],
      schema: {
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.user_id;

      await pushService.unregisterToken(userId);

      reply.code(204).send();
    }
  );

  // Test push notification (for development/testing)
  if (process.env.NODE_ENV !== 'production') {
    server.post(
      '/users/push-token/test',
      {
        preHandler: [server.authenticate],
        schema: {
          response: {
            200: {
              type: 'object',
              properties: {
                sent: { type: 'number' },
                failed: { type: 'number' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user.user_id;

        const result = await pushService.sendToUser(
          userId,
          'Test Notification',
          'This is a test push notification from Remote Days',
          'daily_reminder',
          { test: true }
        );

        reply.send(result);
      }
    );
  }
}

export default pushTokenRoutes;
