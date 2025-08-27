export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  
  // Plaid-specific errors
  PLAID_INVALID_CREDENTIALS = 'plaid_invalid_credentials',
  PLAID_RATE_LIMIT = 'plaid_rate_limit',
  PLAID_INSTITUTION_ERROR = 'plaid_institution_error',
  PLAID_ITEM_ERROR = 'plaid_item_error',
  PLAID_NETWORK_ERROR = 'plaid_network_error',
  
  // Database errors
  DATABASE_CONNECTION_ERROR = 'database_connection_error',
  DATABASE_CONSTRAINT_ERROR = 'database_constraint_error',
  
  // Validation errors
  INVALID_REQUEST_DATA = 'invalid_request_data',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  
  // Business logic errors
  CONNECTION_NOT_FOUND = 'connection_not_found',
  ACCOUNT_SYNC_FAILED = 'account_sync_failed',
  TRANSACTION_SYNC_FAILED = 'transaction_sync_failed',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode = 500,
  details?: Record<string, unknown>
): Response {
  const errorResponse: ErrorDetails = {
    code,
    message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    // TODO: Add request ID from headers
  };

  return new Response(JSON.stringify({ error: errorResponse }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

// User-friendly error messages
export const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Please sign in to continue',
  [ErrorCode.FORBIDDEN]: 'You don\'t have permission to access this resource',
  
  [ErrorCode.PLAID_INVALID_CREDENTIALS]: 'Bank connection failed. Please try connecting again.',
  [ErrorCode.PLAID_RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [ErrorCode.PLAID_INSTITUTION_ERROR]: 'Your bank is temporarily unavailable. Please try again later.',
  [ErrorCode.PLAID_ITEM_ERROR]: 'There was an issue with your bank connection. Please reconnect your account.',
  [ErrorCode.PLAID_NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Service temporarily unavailable. Please try again.',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 'This data already exists in our system.',
  
  [ErrorCode.INVALID_REQUEST_DATA]: 'Invalid request. Please check your input.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required information.',
  
  [ErrorCode.CONNECTION_NOT_FOUND]: 'Bank connection not found. Please connect your account first.',
  [ErrorCode.ACCOUNT_SYNC_FAILED]: 'Failed to sync account information. Please try again.',
  [ErrorCode.TRANSACTION_SYNC_FAILED]: 'Failed to sync transactions. Please try again.',
};