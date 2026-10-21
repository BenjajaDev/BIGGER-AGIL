import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/core/logger.js';
import { openDatabase, runMigrations, type DatabaseConnection } from '../../src/db/client.js';
import { seedDatabase } from '../../src/db/seed/seed.js';
import { EventHub } from '../../src/realtime/event-hub.js';

export interface TestContext {
  app: Express;
  connection: DatabaseConnection;
}

export function createTestContext({ withDemoOrders = true } = {}): TestContext {
  const connection = openDatabase(':memory:');
  runMigrations(connection.db);
  seedDatabase(connection.db, { withDemoOrders });

  const app = createApp({
    env: { CORS_ORIGINS: ['http://localhost:5173'] },
    logger: createLogger('silent'),
    db: connection.db,
    eventHub: new EventHub(),
  });

  return { app, connection };
}
