import { z } from 'zod';

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_STATE_TRANSITION',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiFieldIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type ApiFieldIssue = z.infer<typeof ApiFieldIssueSchema>;

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    issues: z.array(ApiFieldIssueSchema).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export interface ApiSuccessBody<T> {
  data: T;
}

export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({ data });
}
