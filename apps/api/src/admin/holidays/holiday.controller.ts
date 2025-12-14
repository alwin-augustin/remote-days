import { FastifyReply, FastifyRequest } from 'fastify';
import { HolidayService } from '../../services/holiday.service';
import { AppError } from '../../errors/app-error';

export class HolidayController {
    constructor(private holidayService: HolidayService) { }

    async addHoliday(
        request: FastifyRequest<{ Body: { date: string; description: string; country_code?: string } }>,
        reply: FastifyReply
    ) {
        const { date, description, country_code } = request.body;
        const holiday = await this.holidayService.addHoliday(date, description, country_code);
        return reply.status(201).send(holiday);
    }

    async getHolidays(
        request: FastifyRequest<{ Querystring: { year?: number; country_code?: string } }>,
        reply: FastifyReply
    ) {
        const { year, country_code } = request.query;
        const holidays = await this.holidayService.getHolidays(year, country_code);
        return reply.send(holidays);
    }

    async deleteHoliday(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
        const { id } = request.params;
        await this.holidayService.deleteHoliday(id);
        return reply.status(204).send();
    }
}
