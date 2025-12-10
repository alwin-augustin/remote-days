import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

async function authRoutes(server: FastifyInstance, options: { controller: AuthController }) {
  const { controller } = options;

  server.post('/auth/login', controller.loginHandler);
  server.post('/auth/logout', controller.logoutHandler);
  server.get('/auth/me', { preHandler: [server.authenticate] }, controller.getMeHandler);

  server.post('/auth/password-reset-request', controller.passwordResetRequestHandler);
  server.post('/auth/password-reset', controller.passwordResetHandler);
}

export default authRoutes;