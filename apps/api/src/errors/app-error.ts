import { ErrorCode, ErrorMessages } from './error-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: ErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: ErrorCode,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }

  /**
   * Create an error from an error code
   */
  static fromCode(code: ErrorCode, statusCode: number, details?: unknown): AppError {
    return new AppError(ErrorMessages[code], statusCode, code, details);
  }
}

/**
 * Specialized error classes for common HTTP status codes
 */
export class ValidationError extends AppError {
  constructor(message: string, code?: ErrorCode, details?: unknown) {
    super(message, 400, code || ErrorCode.VALIDATION_FAILED, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: ErrorCode) {
    super(message, 401, code || ErrorCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: ErrorCode) {
    super(message, 403, code || ErrorCode.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code?: ErrorCode) {
    super(message, 404, code || ErrorCode.RESOURCE_NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: ErrorCode, details?: unknown) {
    super(message, 409, code || ErrorCode.RESOURCE_CONFLICT, details);
  }
}
