/**
 * Every error the API returns uses the shape `{ error: { code, message,
 * details? } }` defined in docs/gate-1/04-api-contracts.md, with a stable
 * string `code` clients can branch on (e.g. `AGE_RESTRICTED`,
 * `FEASIBILITY_BLOCKED`) — never just an HTTP status and free text.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  validation: (details: unknown) =>
    new AppError(400, 'VALIDATION_FAILED', 'Request failed validation.', details),
  unauthorized: (message = 'Authentication required.') =>
    new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (action: string, entity: string) =>
    new AppError(
      403,
      'FORBIDDEN',
      `Not permitted to ${action} this ${entity}.`,
    ),
  notFound: (entity: string) => new AppError(404, 'NOT_FOUND', `${entity} not found.`),
  conflict: (message: string) => new AppError(409, 'CONFLICT', message),
  ageRestricted: () =>
    new AppError(403, 'AGE_RESTRICTED', 'This content is age-restricted in your jurisdiction.'),
  internal: (message = 'Internal server error.') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};
