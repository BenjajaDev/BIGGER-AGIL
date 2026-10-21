import { loadEnv } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { openDatabase, runMigrations } from '../db/client.js';
import { seedDatabase } from '../db/seed/seed.js';

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
  });
  logger.info(
    { result },
    result === 'seeded' ? 'Datos de ejemplo cargados' : 'La base ya tenía datos; seed omitido',
  );
} finally {
  connection.close();
}
