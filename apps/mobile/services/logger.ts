/**
 * Logger service - centralizes logging and can be disabled in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LoggerConfig = {
  enabled: __DEV__,
  minLevel: 'debug',
};

const shouldLog = (level: LogLevel): boolean => {
  return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

const formatMessage = (tag: string, message: string): string => {
  return `[${tag}] ${message}`;
};

export const logger = {
  configure: (options: Partial<LoggerConfig>): void => {
    Object.assign(config, options);
  },

  debug: (tag: string, message: string, data?: unknown): void => {
    if (shouldLog('debug')) {
      if (data !== undefined) {
        console.log(formatMessage(tag, message), data);
      } else {
        console.log(formatMessage(tag, message));
      }
    }
  },

  info: (tag: string, message: string, data?: unknown): void => {
    if (shouldLog('info')) {
      if (data !== undefined) {
        console.info(formatMessage(tag, message), data);
      } else {
        console.info(formatMessage(tag, message));
      }
    }
  },

  warn: (tag: string, message: string, data?: unknown): void => {
    if (shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(formatMessage(tag, message), data);
      } else {
        console.warn(formatMessage(tag, message));
      }
    }
  },

  error: (tag: string, message: string, error?: unknown): void => {
    if (shouldLog('error')) {
      if (error !== undefined) {
        console.error(formatMessage(tag, message), error);
      } else {
        console.error(formatMessage(tag, message));
      }
    }
    // In production, you could send to error tracking service here
    // e.g., Sentry.captureException(error);
  },
};

export default logger;
