"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function authRoutes(server, options) {
    const { controller } = options;
    server.post('/auth/login', controller.loginHandler);
    server.post('/auth/logout', controller.logoutHandler);
    server.get('/auth/me', { preHandler: [server.authenticate] }, controller.getMeHandler);
    server.post('/auth/password-reset-request', controller.passwordResetRequestHandler);
    server.post('/auth/password-reset', controller.passwordResetHandler);
}
exports.default = authRoutes;
