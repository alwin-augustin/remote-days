import { FastifyRequest, FastifyReply } from 'fastify';
import { work_status } from '@remotedays/types';
import { EntryService } from '../services/entry.service';
import { AppError } from '../errors/app-error';

export class EntriesController {
  constructor(private readonly entryService: EntryService) { }

  createEntryHandler = async (
    request: FastifyRequest<{ Body: { status: work_status; date: string } }>,
    reply: FastifyReply
  ) => {
    const { status, date } = request.body;
    const user = request.user;

    if (!status || !date) {
      throw new AppError('Status and date are required', 400);
    }

    const entry = await this.entryService.createOrUpdateEntry(user.user_id, date, status, user.role, user.user_id);
    reply.code(201).send(entry);
  };

  overrideEntryHandler = async (
    request: FastifyRequest<{ Body: { targetUserId: string; date: string; status: work_status; reason: string } }>,
    reply: FastifyReply
  ) => {
    const { targetUserId, date, status, reason } = request.body;
    const user = request.user;

    if (!targetUserId || !date || !status || !reason) {
      throw new AppError('Target user, date, status, and reason are required', 400);
    }

    const entry = await this.entryService.overrideEntry(targetUserId, date, status, reason, user.user_id, user.role);
    reply.code(200).send(entry);
  };

  getEntriesHandler = async (
    request: FastifyRequest<{ Querystring: { year?: string; month?: string; limit?: string; offset?: string } }>,
    reply: FastifyReply
  ) => {
    const { year, month, limit, offset } = request.query;
    const user = request.user;

    const entries = await this.entryService.getEntries(user.user_id, {
      year,
      month,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    reply.code(200).send(entries);
  };

  getStatsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const stats = await this.entryService.getUserStats(user.user_id);
    reply.code(200).send(stats);
  };
}
