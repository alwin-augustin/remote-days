/**
 * Standardized error codes for the Remote Days API
 * Format: ERR_<DOMAIN>_<NUMBER>
 */
export enum ErrorCode {
  // Authentication errors (ERR_AUTH_xxx)
  INVALID_CREDENTIALS = 'ERR_AUTH_001',
  TOKEN_EXPIRED = 'ERR_AUTH_002',
  TOKEN_INVALID = 'ERR_AUTH_003',
  UNAUTHORIZED = 'ERR_AUTH_004',
  FORBIDDEN = 'ERR_AUTH_005',

  // User errors (ERR_USER_xxx)
  USER_NOT_FOUND = 'ERR_USER_001',
  USER_ALREADY_EXISTS = 'ERR_USER_002',
  USER_INACTIVE = 'ERR_USER_003',
  INVALID_USER_DATA = 'ERR_USER_004',

  // Entry errors (ERR_ENTRY_xxx)
  ENTRY_NOT_FOUND = 'ERR_ENTRY_001',
  ENTRY_LOCKED = 'ERR_ENTRY_002',
  ENTRY_CONFLICT = 'ERR_ENTRY_003',
  INVALID_ENTRY_STATUS = 'ERR_ENTRY_004',
  ENTRY_DATE_INVALID = 'ERR_ENTRY_005',

  // Request errors (ERR_REQUEST_xxx)
  REQUEST_NOT_FOUND = 'ERR_REQUEST_001',
  REQUEST_ALREADY_PROCESSED = 'ERR_REQUEST_002',
  INVALID_REQUEST_STATUS = 'ERR_REQUEST_003',

  // Validation errors (ERR_VAL_xxx)
  VALIDATION_FAILED = 'ERR_VAL_001',
  MISSING_REQUIRED_FIELD = 'ERR_VAL_002',
  INVALID_FORMAT = 'ERR_VAL_003',
  INVALID_DATE_RANGE = 'ERR_VAL_004',

  // Resource errors (ERR_RES_xxx)
  RESOURCE_NOT_FOUND = 'ERR_RES_001',
  RESOURCE_CONFLICT = 'ERR_RES_002',
  RESOURCE_LOCKED = 'ERR_RES_003',

  // Rate limiting (ERR_RATE_xxx)
  RATE_LIMIT_EXCEEDED = 'ERR_RATE_001',

  // Server errors (ERR_SRV_xxx)
  INTERNAL_SERVER_ERROR = 'ERR_SRV_001',
  DATABASE_ERROR = 'ERR_SRV_002',
  EMAIL_SEND_FAILED = 'ERR_SRV_003',

  // File errors (ERR_FILE_xxx)
  FILE_UPLOAD_FAILED = 'ERR_FILE_001',
  FILE_TOO_LARGE = 'ERR_FILE_002',
  INVALID_FILE_FORMAT = 'ERR_FILE_003',
}

/**
 * Error messages for each error code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCode.TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCode.UNAUTHORIZED]: 'You must be logged in to access this resource',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource',

  // User
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'A user with this email already exists',
  [ErrorCode.USER_INACTIVE]: 'This user account is inactive',
  [ErrorCode.INVALID_USER_DATA]: 'Invalid user data provided',

  // Entry
  [ErrorCode.ENTRY_NOT_FOUND]: 'Entry not found',
  [ErrorCode.ENTRY_LOCKED]: 'This entry is locked and cannot be modified',
  [ErrorCode.ENTRY_CONFLICT]: 'An entry for this date already exists',
  [ErrorCode.INVALID_ENTRY_STATUS]: 'Invalid entry status',
  [ErrorCode.ENTRY_DATE_INVALID]: 'Invalid entry date',

  // Request
  [ErrorCode.REQUEST_NOT_FOUND]: 'Request not found',
  [ErrorCode.REQUEST_ALREADY_PROCESSED]: 'This request has already been processed',
  [ErrorCode.INVALID_REQUEST_STATUS]: 'Invalid request status',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format',
  [ErrorCode.INVALID_DATE_RANGE]: 'Invalid date range',

  // Resource
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.RESOURCE_CONFLICT]: 'Resource conflict',
  [ErrorCode.RESOURCE_LOCKED]: 'Resource is locked',

  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',

  // Server
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.EMAIL_SEND_FAILED]: 'Failed to send email',

  // File
  [ErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed',
  [ErrorCode.FILE_TOO_LARGE]: 'File is too large',
  [ErrorCode.INVALID_FILE_FORMAT]: 'Invalid file format',
};
