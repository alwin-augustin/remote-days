"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const worker_1 = require("./worker/worker");
const server = (0, app_1.build)({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
        },
    },
});
const start = async () => {
    try {
        await server.ready();
        (0, worker_1.startWorker)(server);
        await server.listen({ port: env_1.config.PORT, host: env_1.config.HOST });
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
        await server.close();
        server.log.info('Server shut down.');
        process.exit(0);
    });
});
start();
