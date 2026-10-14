/**
 * Logger utility for the web application
 *
 * In development: Logs to console with formatted output
 * In production: Logs errors for monitoring (can be extended to Sentry, etc.)
 *
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Send error to monitoring service (Sentry, etc.)
 * TODO: Implement integration with error tracking service
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function reportError(_error: Error, _context?: LogContext): void {
  // In production, send to error tracking service
  // Example: Sentry.captureException(_error, { extra: _context });
  if (!isDev) {
    // For now, just ensure errors are logged
    // This is where you'd integrate Sentry or similar
  }
}

export const logger = {
  /**
   * Debug level - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  /**
   * Info level - general operational information
   */
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.info(formatMessage('info', message, context));
    }
  },

  /**
   * Warn level - potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage('warn', message, context));
  },

  /**
   * Error level - error events
   * Automatically reports to monitoring service in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error(formatMessage('error', message, context), errorObj);

    // Report to monitoring service
    reportError(errorObj, { message, ...context });
  },

  /**
   * Track a specific event (for analytics)
   */
  track(event: string, properties?: LogContext): void {
    if (isDev) {
      console.info(formatMessage('info', `[TRACK] ${event}`, properties));
    }
    // In production, send to analytics service
  },
};

export default logger;
