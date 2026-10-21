import type { DiningTable } from '@bigger/shared';
import { asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { diningTables } from '../../db/schema.js';

export interface TablesRepository {
  listActive: () => Promise<DiningTable[]>;
}

export class DrizzleTablesRepository implements TablesRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async listActive(): Promise<DiningTable[]> {
    return this.#db
      .select({
        id: diningTables.id,
        number: diningTables.number,
        label: diningTables.label,
        sortOrder: diningTables.sortOrder,
      })
      .from(diningTables)
      .where(eq(diningTables.isActive, true))
      .orderBy(asc(diningTables.sortOrder), asc(diningTables.number));
  }
}
