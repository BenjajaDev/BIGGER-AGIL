import type { Express } from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/core/logger.js';
import { openDatabase, runMigrations, type DatabaseConnection } from '../../src/db/client.js';
import { seedDatabase } from '../../src/db/seed/seed.js';
import { hashPin } from '../../src/modules/admin-auth/pin-hash.js';
import { EventHub } from '../../src/realtime/event-hub.js';

export const TEST_ADMIN_PIN = '482915';
const pinHash = hashPin(TEST_ADMIN_PIN);

export interface TestContext {
  app: Express;
  connection: DatabaseConnection;
  eventHub: EventHub;
  uploadsDir: string;
}

export interface TestContextOptions {
  withDemoOrders?: boolean;
  now?: () => Date;
}

export async function createTestContext({
  withDemoOrders = true,
  now = () => new Date(),
}: TestContextOptions = {}): Promise<TestContext> {
  const connection = openDatabase(':memory:');
  runMigrations(connection.db);
  seedDatabase(connection.db, { withDemoOrders });
  const eventHub = new EventHub();
  const uploadsDir = mkdtempSync(join(tmpdir(), 'bigger-uploads-'));

  const app = createApp({
    env: { CORS_ORIGINS: ['http://localhost:5173'] },
    logger: createLogger('silent'),
    db: connection.db,
    eventHub,
    adminAuth: { pinHash: await pinHash, sessionSecret: 'test-session-secret-0123456789abcdef' },
    uploadsDir,
    clock: { timeZone: 'America/Santiago', now },
  });

  return { app, connection, eventHub, uploadsDir };
}
