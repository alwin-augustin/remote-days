import { FastifyRequest, FastifyReply } from 'fastify';
import { work_status } from '@remotedays/types';
import { EntryService } from '../services/entry.service';

export class EntriesController {
  constructor(private readonly entryService: EntryService) {}

  createEntryHandler = async (
    request: FastifyRequest<{ Body: { status: work_status; date: string } }>,
    reply: FastifyReply
  ) => {
    const { status, date } = request.body;
    const user = request.user;

    const allowOverwrite = ['hr', 'admin'].includes(user.role);
    const entry = await this.entryService.createOrUpdateEntry(user.user_id, date, status, allowOverwrite, user.user_id);
    return reply.code(201).send(entry);
  };

  // PATCH /entries/:userId/:date
  overrideEntryHandler = async (
    request: FastifyRequest<{
      Params: { userId: string; date: string };
      Body: { status: work_status; reason: string };
    }>,
    reply: FastifyReply
  ) => {
    const { userId: targetUserId, date } = request.params;
    const { status, reason } = request.body;
    const user = request.user;

    const entry = await this.entryService.overrideEntry(targetUserId, date, status, reason, user.user_id);
    return reply.code(200).send(entry);
  };

  getEntriesHandler = async (
    request: FastifyRequest<{ Querystring: { year?: string; month?: string; limit?: number; offset?: number } }>,
    reply: FastifyReply
  ) => {
    const { year, month, limit, offset } = request.query;
    const user = request.user;

    const entries = await this.entryService.getEntries(user.user_id, {
      year: year?.toString(),
      month: month?.toString(),
      limit: limit ?? 10,
      offset: offset ?? 0,
    });

    return reply.code(200).send(entries);
  };

  getStatsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const stats = await this.entryService.getUserStats(user.user_id);
    return reply.code(200).send(stats);
  };
}
