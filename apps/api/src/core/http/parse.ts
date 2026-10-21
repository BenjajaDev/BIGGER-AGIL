import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

/** Validates untrusted input at the HTTP boundary and maps failures to a 400 response. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw AppError.validation(
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
