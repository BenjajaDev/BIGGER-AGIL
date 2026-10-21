import { ApiErrorBodySchema, type ApiErrorCode, type ApiFieldIssue } from '@bigger/shared';
import { z } from 'zod';
import { webEnv } from '../config/env';

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number | null;
  readonly issues: readonly ApiFieldIssue[];

  constructor(
    code: ClientErrorCode,
    message: string,
    status: number | null,
    issues: readonly ApiFieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.issues = issues;
  }
}

export type QueryParams = Record<string, string | undefined>;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

const SuccessEnvelopeSchema = z.object({ data: z.unknown() });

export function buildApiUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(`${webEnv.VITE_API_BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Every call validates the payload at runtime: the UI never trusts an unchecked response. */
export async function requestJson<T extends z.ZodType>(
  method: HttpMethod,
  path: string,
  schema: T,
  { params, body, signal }: RequestOptions = {},
): Promise<z.output<T>> {
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, params), {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError('NETWORK_ERROR', 'No hay conexión con el servidor del local', null);
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const parsedError = ApiErrorBodySchema.safeParse(payload);
    throw parsedError.success
      ? new ApiRequestError(
          parsedError.data.error.code,
          parsedError.data.error.message,
          response.status,
          parsedError.data.error.issues,
        )
      : new ApiRequestError(
          'INTERNAL_ERROR',
          'El servidor respondió con un error',
          response.status,
        );
  }

  const envelope = SuccessEnvelopeSchema.safeParse(payload);
  const parsed = envelope.success ? schema.safeParse(envelope.data.data) : null;
  if (!parsed?.success) {
    throw new ApiRequestError(
      'INVALID_RESPONSE',
      'La respuesta del servidor no es válida',
      response.status,
    );
  }
  return parsed.data;
}

export function getJson<T extends z.ZodType>(
  path: string,
  schema: T,
  params?: QueryParams,
  signal?: AbortSignal,
): Promise<z.output<T>> {
  return requestJson('GET', path, schema, {
    ...(params ? { params } : {}),
    ...(signal ? { signal } : {}),
  });
}
