"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hr_controller_1 = require("./hr.controller");
async function hrRoutes(server) {
    server.get('/hr/summary', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hr_controller_1.getEmployeeSummaryHandler);
    server.put('/hr/entries/:id', {
        preHandler: [server.authenticate, server.authorize('hr')],
    }, hr_controller_1.updateEntryHandler);
}
exports.default = hrRoutes;
