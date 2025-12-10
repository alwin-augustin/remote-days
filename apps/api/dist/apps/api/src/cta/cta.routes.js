"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cta_controller_1 = require("./cta.controller");
async function ctaRoutes(server) {
    server.get('/cta', cta_controller_1.recordStatusHandler);
}
exports.default = ctaRoutes;
