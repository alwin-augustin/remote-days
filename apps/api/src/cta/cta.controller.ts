import { FastifyRequest, FastifyReply } from 'fastify';
import { CtaService } from '../services/cta.service';
import { AppError } from '../errors/app-error';

export class CtaController {
  constructor(private readonly ctaService: CtaService) {}

  recordStatusHandler = async (request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.body;

    if (!token) {
      throw new AppError('Token is required', 400);
    }

    const result = await this.ctaService.recordStatusFromToken(token);
    reply.code(200).send({ message: 'Status recorded', ...result });
  };
}
