import { FastifyRequest, FastifyReply } from 'fastify';
import { work_status } from '@tracker/types';
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

    const entry = await this.entryService.createOrUpdateEntry(
      user.user_id,
      date,
      status,
      user.role,
      user.user_id
    );
    reply.code(201).send(entry);
  }

  getEntriesHandler = async (
    request: FastifyRequest<{ Querystring: { year: string; month: string } }>,
    reply: FastifyReply
  ) => {
    const { year, month } = request.query;
    const user = request.user;

    if (!year || !month) {
      throw new AppError('Year and month are required', 400);
    }

    const entries = await this.entryService.getEntriesForMonth(user.user_id, year, month);
    reply.code(200).send(entries);
  }

  getStatsHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const user = request.user;
    const stats = await this.entryService.getUserStats(user.user_id);
    reply.code(200).send(stats);
  }
}