import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MIGRATIONS_DIR } from '../paths.js';
import * as schema from './schema.js';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  db: AppDatabase;
  close: () => void;
}

const IN_MEMORY = ':memory:';

export function openDatabase(path: string): DatabaseConnection {
  if (path !== IN_MEMORY) {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return {
    db: drizzle({ client: sqlite, schema, casing: 'snake_case' }),
    close: () => {
      sqlite.close();
    },
  };
}

/**
 * Foreign keys are switched off while migrating (SQLite's recipe for rebuilding a table: with
 * them on, dropping a parent table would cascade-delete its children) and checked afterwards.
 */
export function runMigrations(db: AppDatabase): void {
  db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    const violations = db.all(sql`PRAGMA foreign_key_check`);
    if (violations.length > 0) {
      throw new Error(`La migración dejó ${violations.length} referencias inválidas`);
    }
  } finally {
    db.run(sql`PRAGMA foreign_keys = ON`);
  }
}
