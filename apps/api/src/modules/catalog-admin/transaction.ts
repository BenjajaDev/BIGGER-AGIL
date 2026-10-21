import type { AppDatabase } from '../../db/client.js';

export type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

export function toIso(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}
