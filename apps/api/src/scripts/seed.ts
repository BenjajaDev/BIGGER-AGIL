import { loadEnv } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { openDatabase, runMigrations } from '../db/client.js';
import { seedDatabase, type SeedResult } from '../db/seed/seed.js';

const SEED_MESSAGES: Record<SeedResult, string> = {
  seeded: 'Catálogo cargado',
  reset: 'Base reiniciada y catálogo cargado de nuevo',
  skipped: 'La base ya tenía datos; seed omitido (usa pnpm db:reset para reemplazarlos)',
};

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

if (env.NODE_ENV === 'production') {
  logger.fatal('El seed de ejemplo no se ejecuta en producción');
  process.exit(1);
}

const connection = openDatabase(env.DATABASE_PATH);

try {
  runMigrations(connection.db);
  const result = seedDatabase(connection.db, {
    withDemoOrders: !process.argv.includes('--no-demo'),
    reset: process.argv.includes('--reset'),
  });
  logger.info({ result }, SEED_MESSAGES[result]);
} finally {
  connection.close();
}
