/**
 * Custom error classes for API and application errors
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly isApiError = true;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static isApiError(error: unknown): error is ApiError {
    return (
      error instanceof ApiError ||
      (error instanceof Error && 'isApiError' in error && error.isApiError === true)
    );
  }

  static fromAxiosError(error: unknown): ApiError {
    if (ApiError.isApiError(error)) {
      return error;
    }

    if (error instanceof Error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string; code?: string };
        };
      };

      const status = axiosError.response?.status ?? 0;
      const message = axiosError.response?.data?.message ?? error.message;
      const code = axiosError.response?.data?.code;

      return new ApiError(message, status, code);
    }

    return new ApiError('An unknown error occurred', 0);
  }
}

export class NetworkError extends Error {
  public readonly isNetworkError = true;

  constructor(message = 'Network error - please check your connection') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
