import { FastifyInstance } from 'fastify';
import { CtaController } from './cta.controller';

async function ctaRoutes(server: FastifyInstance, options: { ctaController: CtaController }) {
  const { ctaController } = options;
  server.get('/cta', ctaController.recordStatusHandler as any);
}

export default ctaRoutes;
