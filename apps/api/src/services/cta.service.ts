import { ITokenRepository } from '../repositories/token.repository';
import { IEntryRepository } from '../repositories/entry.repository';
import { AppError } from '../errors/app-error';
import { work_status } from '@remotedays/types';

export class CtaService {
  constructor(
    private tokenRepo: ITokenRepository,
    private entryRepo: IEntryRepository
  ) {}

  async recordStatusFromToken(token: string): Promise<{ status: string; date: string }> {
    if (!token) {
      throw new AppError('Token is required', 400);
    }

    const tokenData = await this.tokenRepo.findByToken(token);

    if (!tokenData) {
      throw new AppError('Invalid token', 400);
    }

    if (tokenData.action === 'password-reset') {
      throw new AppError('Invalid token type', 400);
    }

    if (tokenData.used) {
      throw new AppError('Token has already been used', 400);
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      throw new AppError('Token has expired', 400);
    }

    if (!tokenData.target_date) {
      throw new AppError('Token is missing target date', 500);
    }

    // Cast action to work_status. We trust the token generation to put valid status in action.
    const status = tokenData.action as work_status;

    await this.entryRepo.upsert(
      tokenData.user_id,
      tokenData.target_date,
      status,
      'email_link',
      tokenData.user_id // actorId
    );

    await this.tokenRepo.markAsUsed(token);

    return { status, date: tokenData.target_date };
  }
}
