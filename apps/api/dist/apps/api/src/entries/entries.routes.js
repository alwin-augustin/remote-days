"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function entriesRoutes(server, options) {
    server.addHook('preHandler', server.authenticate);
    const { controller } = options;
    server.post('/entries', controller.createEntryHandler);
    server.get('/entries', controller.getEntriesHandler);
    server.get('/entries/stats', controller.getStatsHandler);
}
exports.default = entriesRoutes;
