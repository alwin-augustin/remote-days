"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function ctaRoutes(server, options) {
    const { ctaController } = options;
    server.post('/cta/process', {}, ctaController.recordStatusHandler);
}
exports.default = ctaRoutes;
