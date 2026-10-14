import { build } from './app';
import { config } from './config/env';
import { startDemoSeedCron } from './jobs/demo-seed.job';

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

    // Nightly demo-data reset (no-op unless DEMO_SEED_ENABLED).
    startDemoSeedCron({
      info: (context, message) => server.log.info(context, message),
      warn: (context, message) => server.log.warn(context, message),
      error: (context, message) => server.log.error(context, message),
    });
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
