import { networkInterfaces } from 'node:os';
import { createApp } from './app.js';
import { startBackups } from './core/backup.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './core/logger.js';
import { openDatabase, runMigrations } from './db/client.js';
import { readApiVersion } from './paths.js';
import { buildPrintingSetup } from './modules/printing/printing.config.js';
import { EventHub } from './realtime/event-hub.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const connection = openDatabase(env.DATABASE_PATH);
runMigrations(connection.db);

const app = createApp({
  env,
  logger,
  db: connection.db,
  eventHub: new EventHub(),
  adminAuth: { pinHash: env.ADMIN_PIN_HASH, sessionSecret: env.ADMIN_SESSION_SECRET },
  uploadsDir: env.UPLOADS_DIR,
  clock: { timeZone: env.BUSINESS_TIMEZONE, now: () => new Date() },
  printing: buildPrintingSetup(env),
  system: { version: readApiVersion(), port: env.PORT, networkInterfaces },
});

const backups =
  env.BACKUP_DIR === undefined
    ? null
    : startBackups({
        directory: env.BACKUP_DIR,
        keep: env.BACKUP_KEEP,
        timeZone: env.BUSINESS_TIMEZONE,
        logger,
        backup: connection.backup,
      });

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT }, 'BIGGER Ágil API escuchando');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Cerrando servidor');
  backups?.stop();
  server.close(() => {
    connection.close();
    process.exit(0);
  });
  server.closeAllConnections();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
