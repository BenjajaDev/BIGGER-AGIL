import { loadEnv } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { openDatabase, runMigrations } from '../db/client.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const connection = openDatabase(env.DATABASE_PATH);

try {
  runMigrations(connection.db);
  logger.info({ database: env.DATABASE_PATH }, 'Migraciones aplicadas');
} finally {
  connection.close();
}
