"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntriesController = void 0;
const app_error_1 = require("../errors/app-error");
class EntriesController {
    constructor(entryService) {
        this.entryService = entryService;
        this.createEntryHandler = async (request, reply) => {
            const { status, date } = request.body;
            const user = request.user;
            if (!status || !date) {
                throw new app_error_1.AppError('Status and date are required', 400);
            }
            const entry = await this.entryService.createOrUpdateEntry(user.user_id, date, status, user.role, user.user_id);
            reply.code(201).send(entry);
        };
        this.getEntriesHandler = async (request, reply) => {
            const { year, month } = request.query;
            const user = request.user;
            if (!year || !month) {
                throw new app_error_1.AppError('Year and month are required', 400);
            }
            const entries = await this.entryService.getEntriesForMonth(user.user_id, year, month);
            reply.code(200).send(entries);
        };
        this.getStatsHandler = async (request, reply) => {
            const user = request.user;
            const stats = await this.entryService.getUserStats(user.user_id);
            reply.code(200).send(stats);
        };
    }
}
exports.EntriesController = EntriesController;
