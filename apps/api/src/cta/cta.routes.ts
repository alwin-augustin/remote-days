import { FastifyInstance } from 'fastify';
import { CtaController } from './cta.controller';

async function ctaRoutes(server: FastifyInstance, options: { ctaController: CtaController }) {
  const { ctaController } = options;
  server.post(
    '/cta/process',
    {},
    ctaController.recordStatusHandler as any
  );
}

export default ctaRoutes;
