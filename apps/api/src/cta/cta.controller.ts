import { FastifyRequest, FastifyReply } from 'fastify';
import { CtaService } from '../services/cta.service';
import { AppError } from '../errors/app-error';
import { decrypt } from '../utils/crypto';

export class CtaController {
  constructor(private readonly ctaService: CtaService) {}

  recordStatusHandler = async (
    request: FastifyRequest<{ Body: { token: string; email?: string } }>,
    reply: FastifyReply
  ) => {
    const { token, email } = request.body;

    if (!token) {
      throw new AppError('Token is required', 400);
    }

    let decryptedEmail: string | undefined;
    if (email) {
      try {
        decryptedEmail = decrypt(email);
      } catch {
        throw new AppError('Invalid email link', 400);
      }
    }

    const result = await this.ctaService.recordStatusFromToken(token, decryptedEmail);
    reply.code(200).send({ message: 'Status recorded', ...result });
  };
}
