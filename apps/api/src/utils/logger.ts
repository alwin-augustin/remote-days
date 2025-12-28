import pino from 'pino';
import { config } from '../config/env';

/**
 * Application-wide logger instance
 * Uses Pino for high-performance structured logging
 *
 * Log levels:
 * - fatal: Application crash imminent
 * - error: Error events that might still allow the application to continue
 * - warn: Potentially harmful situations
 * - info: General operational information
 * - debug: Detailed information for debugging
 * - trace: Very detailed tracing information
 */
export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: config.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // In production, logs are JSON for log aggregation tools
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with a specific context/module name
 * @param module - The module or service name
 * @returns A child logger with the module context
 *
 * @example
 * const log = createLogger('RequestService');
 * log.info('Processing request');
 * // Output: {"level":"info","module":"RequestService","msg":"Processing request"}
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

export default logger;
