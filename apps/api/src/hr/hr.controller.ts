import { FastifyRequest, FastifyReply } from 'fastify';
import { work_status } from '@tracker/types';
import { HRService } from '../services/hr.service';
import { AppError } from '../errors/app-error';

export class HRController {
    constructor(private readonly hrService: HRService) { }

    getEmployeeSummaryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const summaries = await this.hrService.getEmployeeSummaries();
        reply.code(200).send(summaries);
    }

    getEmployeeEntriesHandler = async (
        request: FastifyRequest<{ Querystring: { year: string; month: string } }>,
        reply: FastifyReply
    ) => {
        const { year, month } = request.query;

        if (!year || !month) {
            throw new AppError('Year and month are required', 400);
        }

        const entries = await this.hrService.getEmployeeEntries(year, month);
        reply.code(200).send(entries);
    }

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

        const validStatuses: work_status[] = ['home', 'office', 'travel', 'sick', 'unknown'];
        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        try {
            const updatedEntry = await this.hrService.updateEntry(id, status, reason, hrUser.user_id);

            if (!updatedEntry) {
                throw new AppError('Entry not found', 404);
            }

            reply.code(200).send(updatedEntry);
        } catch (err: any) {
            // Check for constraint violation on status enum
            if (err.code === '22P02' && err.message.includes('work_status')) {
                throw new AppError('Invalid status value', 400);
            }
            throw err;
        }
    }

    getDailyStatsHandler = async (
        request: FastifyRequest<{ Querystring: { date?: string } }>,
        reply: FastifyReply
    ) => {
        const targetDate = request.query.date || new Date().toISOString().split('T')[0];
        const stats = await this.hrService.getDailyStats(targetDate);
        reply.code(200).send(stats);
    }

    getDailyEntriesHandler = async (
        request: FastifyRequest<{ Querystring: { date?: string } }>,
        reply: FastifyReply
    ) => {
        const targetDate = request.query.date || new Date().toISOString().split('T')[0];
        const entries = await this.hrService.getDailyEntries(targetDate);
        reply.code(200).send(entries);
    }
}