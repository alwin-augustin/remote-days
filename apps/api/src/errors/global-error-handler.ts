import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

/**
 * Consistent API error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code?: ErrorCode | string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
  };
}

export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;
  const timestamp = new Date().toISOString();

  // Handle AppError instances (our custom errors)
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      meta: {
        requestId,
        timestamp,
      },
    };

    request.log.warn(
      {
        err: error,
        requestId,
        code: error.code,
        statusCode: error.statusCode,
      },
      'Application error'
    );

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify validation errors
  if (error.validation) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Validation Error',
        details: error.validation,
      },
      meta: {
        requestId,
        timestamp,
      },
    };

    request.log.warn(
      {
        err: error,
        requestId,
        validation: error.validation,
      },
      'Validation error'
    );

    return reply.status(400).send(response);
  }

  // Log unexpected errors with full details
  request.log.error(
    {
      err: error,
      requestId,
      url: request.url,
      method: request.method,
    },
    'Unexpected error'
  );

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: isDevelopment ? error.message : 'Internal Server Error',
      ...(isDevelopment && error.stack && { details: { stack: error.stack } }),
    },
    meta: {
      requestId,
      timestamp,
    },
  };

  return reply.status(500).send(response);
}
