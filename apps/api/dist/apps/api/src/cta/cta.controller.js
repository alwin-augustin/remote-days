"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CtaController = void 0;
const app_error_1 = require("../errors/app-error");
class CtaController {
    constructor(ctaService) {
        this.ctaService = ctaService;
        this.recordStatusHandler = async (request, reply) => {
            const { token } = request.body;
            if (!token) {
                throw new app_error_1.AppError('Token is required', 400);
            }
            const result = await this.ctaService.recordStatusFromToken(token);
            reply.code(200).send({ message: 'Status recorded', ...result });
        };
    }
}
exports.CtaController = CtaController;
