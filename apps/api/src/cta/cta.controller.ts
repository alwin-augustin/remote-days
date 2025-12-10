import { FastifyRequest, FastifyReply } from 'fastify';
import { CtaService } from '../services/cta.service';
import { AppError } from '../errors/app-error';

export class CtaController {
  constructor(private readonly ctaService: CtaService) { }

  recordStatusHandler = async (
    request: FastifyRequest<{ Querystring: { token: string } }>,
    reply: FastifyReply
  ) => {
    const { token } = request.query;

    if (!token) {
      throw new AppError('Token is required', 400);
    }

    await this.ctaService.recordStatusFromToken(token);
    reply.code(200).send({ message: 'Status recorded' });
  }
}
