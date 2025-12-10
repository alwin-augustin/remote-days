"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv = __importStar(require("dotenv"));
const db_1 = __importDefault(require("./db"));
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const admin_routes_1 = __importDefault(require("./admin/admin.routes"));
const cta_routes_1 = __importDefault(require("./cta/cta.routes"));
const hr_routes_1 = __importDefault(require("./hr/hr.routes"));
const entries_routes_1 = __importDefault(require("./entries/entries.routes"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const worker_1 = require("./worker/worker");
const auth_1 = __importDefault(require("./plugins/auth"));
dotenv.config();
const server = (0, fastify_1.default)({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
        },
    },
});
// Centralized JWT secret check
if (!process.env.JWT_SECRET) {
    server.log.error('FATAL: JWT_SECRET environment variable is not defined.');
    process.exit(1);
}
server.register(cookie_1.default);
server.register(db_1.default);
server.register(auth_1.default);
server.register(rate_limit_1.default, {
    max: 100, // default max requests per window
    timeWindow: '1 minute',
});
// Routes
server.register(auth_routes_1.default, { prefix: '/api' });
server.register(admin_routes_1.default, { prefix: '/api' });
server.register(cta_routes_1.default, { prefix: '/api' });
server.register(hr_routes_1.default, { prefix: '/api' });
server.register(entries_routes_1.default, { prefix: '/api' });
server.get('/', async () => {
    return { hello: 'world' };
});
const start = async () => {
    try {
        await server.ready();
        (0, worker_1.startWorker)(server);
        await server.listen({ port: 3000, host: '0.0.0.0' });
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
    process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully...`);
        await server.close();
        await server.pg.pool.end();
        server.log.info('Server shut down.');
        process.exit(0);
    });
});
start();
