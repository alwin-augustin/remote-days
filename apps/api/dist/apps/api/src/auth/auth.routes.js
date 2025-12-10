"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = require("./auth.controller");
async function authRoutes(server) {
    server.post('/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, auth_controller_1.loginHandler);
    server.post('/auth/logout', auth_controller_1.logoutHandler);
    server.get('/auth/me', { preHandler: [server.authenticate] }, auth_controller_1.getMeHandler);
    // Password reset
    server.post('/auth/password-reset/request', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, auth_controller_1.passwordResetRequestHandler);
    server.post('/auth/password-reset/confirm', auth_controller_1.passwordResetHandler);
}
exports.default = authRoutes;
