"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function hrRoutes(server, options) {
    const { hrController } = options;
    server.get('/hr/summary', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hrController.getEmployeeSummaryHandler);
    server.get('/hr/entries', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hrController.getEmployeeEntriesHandler);
    server.get('/hr/stats/daily', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hrController.getDailyStatsHandler);
    server.get('/hr/entries/daily', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hrController.getDailyEntriesHandler);
    server.put('/hr/entries/:id', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hrController.updateEntryHandler);
}
exports.default = hrRoutes;
