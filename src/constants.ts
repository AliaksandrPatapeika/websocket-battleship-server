/**
 * Regular expression pattern for matching UUIDv4 format.
 * Match routes in the format "/api/users/{UUIDv4}"
 */
export const UUID_V4_REGEX =
  /^\/api\/users\/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

/**
 * HTTP status codes.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Error messages used in the application.
 */
export const ERROR_MESSAGES = {
  INVALID_REQUEST_DATA:
    'Invalid request data. Some or all fields are absent or invalid.',
  RECORD_NOT_FOUND: (userId: string) =>
    `Record with id: ${userId} doesn't exist.`,
  INVALID_USER_ID: 'Invalid user ID. User ID must be a valid UUID.',
  UNKNOWN_ROUTE: 'Invalid route. Route not found.',
  UNKNOWN_ERROR_MESSAGE: 'An unknown error occurred.',
};
