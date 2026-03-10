import { build } from './app';
import { config } from './config/env';

const server = build({
  logger: {
    level: 'info',
    transport:
      config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
          }
        : undefined,
  },
});

const start = async () => {
  try {
    await server.ready();
    await server.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    server.log.info('Server shut down.');
    process.exit(0);
  });
});

start();
