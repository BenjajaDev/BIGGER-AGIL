import type { AppDatabase } from '../client.js';

export type SeedTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
