import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
  },
};

const passwordResetRequestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
};

async function authRoutes(server: FastifyInstance, options: { controller: AuthController }) {
  const { controller } = options;

  server.post('/auth/login', { schema: loginSchema }, controller.loginHandler);
  server.post('/auth/logout', controller.logoutHandler);

  server.get('/auth/me', { preHandler: [server.authenticate] }, controller.getMeHandler);
  server.get('/auth/me/export', { preHandler: [server.authenticate] }, controller.exportDataHandler);
  server.delete('/auth/me', { preHandler: [server.authenticate] }, controller.deleteAccountHandler);

  server.post('/auth/password-reset-request', { schema: passwordResetRequestSchema }, controller.passwordResetRequestHandler);
  server.post('/auth/password-reset', controller.passwordResetHandler);
}

export default authRoutes;
