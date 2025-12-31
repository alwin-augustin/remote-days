import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from './auth.controller';
import { loginJsonSchema, passwordResetRequestJsonSchema, passwordResetJsonSchema } from '../schemas';

// Rate limit configurations for auth endpoints
const authRateLimitConfig = {
  login: {
    max: process.env.NODE_ENV === 'test' ? 100 : 5, // 5 login attempts per window
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest) => {
      // Rate limit by IP + email combination for login
      const body = request.body as { email?: string };
      const email = body?.email?.toLowerCase() || 'unknown';
      return `login:${request.ip}:${email}`;
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many login attempts. Please try again later.',
    }),
  },
  passwordResetRequest: {
    max: process.env.NODE_ENV === 'test' ? 100 : 3, // 3 password reset requests per window
    timeWindow: '15 minutes',
    keyGenerator: (request: FastifyRequest) => {
      const body = request.body as { email?: string };
      const email = body?.email?.toLowerCase() || 'unknown';
      return `password-reset:${request.ip}:${email}`;
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many password reset requests. Please try again later.',
    }),
  },
  passwordReset: {
    max: process.env.NODE_ENV === 'test' ? 100 : 5, // 5 reset attempts per window
    timeWindow: '15 minutes',
    keyGenerator: (request: FastifyRequest) => `password-reset-submit:${request.ip}`,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many password reset attempts. Please try again later.',
    }),
  },
};

async function authRoutes(server: FastifyInstance, options: { controller: AuthController }) {
  const { controller } = options;

  // Login with strict rate limiting
  server.post(
    '/auth/login',
    {
      schema: loginJsonSchema,
      config: {
        rateLimit: authRateLimitConfig.login,
      },
    },
    controller.loginHandler
  );

  server.post('/auth/logout', controller.logoutHandler);

  server.get('/auth/me', { preHandler: [server.authenticate] }, controller.getMeHandler);
  server.get('/auth/me/export', { preHandler: [server.authenticate] }, controller.exportDataHandler);
  server.delete('/auth/me', { preHandler: [server.authenticate] }, controller.deleteAccountHandler);

  // Password reset request with rate limiting
  server.post(
    '/auth/password-reset-request',
    {
      schema: passwordResetRequestJsonSchema,
      config: {
        rateLimit: authRateLimitConfig.passwordResetRequest,
      },
    },
    controller.passwordResetRequestHandler
  );

  // Password reset with rate limiting and stronger validation
  server.post(
    '/auth/password-reset',
    {
      schema: passwordResetJsonSchema,
      config: {
        rateLimit: authRateLimitConfig.passwordReset,
      },
    },
    controller.passwordResetHandler
  );
}

export default authRoutes;
