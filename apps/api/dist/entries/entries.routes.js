"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entries_controller_1 = require("./entries.controller");
async function entriesRoutes(server) {
    server.addHook('preHandler', server.authenticate);
    server.post('/entries', entries_controller_1.createEntryHandler);
    server.get('/entries', entries_controller_1.getEntriesHandler);
}
exports.default = entriesRoutes;
