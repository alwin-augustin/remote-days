import { FastifyRequest, FastifyReply } from 'fastify';
import { work_status } from '@remotedays/types';
import { HRService } from '../services/hr.service';
import { EntryService } from '../services/entry.service';
import { AppError } from '../errors/app-error';

export class HRController {
  constructor(
    private readonly hrService: HRService,
    private readonly entryService: EntryService
  ) {}

  getEmployeeSummaryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const summaries = await this.hrService.getEmployeeSummaries();
    return reply.code(200).send(summaries);
  };

  getEmployeeEntriesHandler = async (
    request: FastifyRequest<{ Querystring: { year: string; month: string } }>,
    reply: FastifyReply
  ) => {
    const { year, month } = request.query;

    if (!year || !month) {
      throw new AppError('Year and month are required', 400);
    }

    const entries = await this.hrService.getEmployeeEntries(year, month);
    return reply.code(200).send(entries);
  };

  updateEntryHandler = async (
    request: FastifyRequest<{ Params: { id: string }; Body: { status: work_status; reason: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { status, reason } = request.body;
    const hrUser = request.user;

    if (!status || !reason) {
      throw new AppError('Status and reason are required', 400);
    }

    const updatedEntry = await this.entryService.overrideEntryById(id, status, reason, hrUser.user_id);

    if (!updatedEntry) {
      throw new AppError('Entry not found', 404);
    }

    return reply.code(200).send(updatedEntry);
  };

  getDailyStatsHandler = async (request: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];
    const stats = await this.hrService.getDailyStats(targetDate);
    return reply.code(200).send(stats);
  };

  getDailyEntriesHandler = async (request: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];
    const entries = await this.hrService.getDailyEntries(targetDate);
    return reply.code(200).send(entries);
  };

  getRiskStatsHandler = async (request: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];
    const stats = await this.hrService.getRiskStats(targetDate);
    return reply.code(200).send(stats);
  };
}
