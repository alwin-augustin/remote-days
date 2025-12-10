"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_controller_1 = require("./admin.controller");
async function adminRoutes(server) {
    server.post('/admin/users', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, admin_controller_1.createUserHandler);
}
exports.default = adminRoutes;
