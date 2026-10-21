import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiRequestError } from '../../services/http-client';

/**
 * Puts server validation issues on their fields (the API uses the same dotted paths as the form)
 * and returns the message for anything that is not tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiRequestError)) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  if (error.code === 'VALIDATION_ERROR' && error.issues.length > 0) {
    for (const issue of error.issues) {
      setError(issue.path as Path<T>, { type: 'server', message: issue.message });
    }
    return 'Revisa los campos marcados.';
  }
  return error.message;
}

/** Message of an array-level rule (e.g. "Agrega al menos una opción"). */
export function arrayErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as { message?: unknown; root?: { message?: unknown } };
  const message = record.root?.message ?? record.message;
  return typeof message === 'string' ? message : undefined;
}
