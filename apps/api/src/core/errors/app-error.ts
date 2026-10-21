import type { ApiErrorCode, ApiFieldIssue } from '@bigger/shared';

const STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues: readonly ApiFieldIssue[] | undefined;

  constructor(code: ApiErrorCode, message: string, issues?: readonly ApiFieldIssue[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.issues = issues;
  }

  static notFound(resource: string): AppError {
    return new AppError('NOT_FOUND', `${resource} no encontrado`);
  }

  static validation(issues: readonly ApiFieldIssue[]): AppError {
    return new AppError('VALIDATION_ERROR', 'Los datos enviados no son válidos', issues);
  }
}
