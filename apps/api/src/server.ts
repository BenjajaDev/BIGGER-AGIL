import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './core/logger.js';
import { openDatabase, runMigrations } from './db/client.js';
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
});

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT }, 'BIGGER Ágil API escuchando');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Cerrando servidor');
  server.close(() => {
    connection.close();
    process.exit(0);
  });
  server.closeAllConnections();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
