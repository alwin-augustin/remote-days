import { FastifyInstance } from 'fastify';
import { SsoController } from './sso.controller';

/**
 * Public SSO routes. Deliberately unauthenticated — these are the endpoints that
 * create a session. Abuse is bounded by rate limiting on the start endpoint
 * (each call issues a login transaction) while the callback is protected by the
 * signed, single-use flow cookie instead.
 */
async function ssoRoutes(server: FastifyInstance, options: { controller: SsoController }) {
  const { controller } = options;

  server.get('/auth/sso/status', controller.statusHandler);

  server.get(
    '/auth/sso/start',
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'test' ? 100 : 20,
          timeWindow: '1 minute',
          keyGenerator: (request) => `sso-start:${request.ip}`,
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many sign-in attempts. Please try again later.',
          }),
        },
      },
    },
    controller.startHandler
  );

  server.get('/auth/sso/callback', controller.callbackHandler);
}

export default ssoRoutes;
