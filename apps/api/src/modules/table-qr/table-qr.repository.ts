import type { TableQr } from '@bigger/shared';
import { asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { diningTables } from '../../db/schema.js';

export interface TableQrRepository {
  listActive: () => Promise<(Omit<TableQr, 'token'> & { token: string | null })[]>;
  setToken: (id: string, token: string) => Promise<boolean>;
  labelForToken: (token: string) => Promise<string | null>;
}

export class DrizzleTableQrRepository implements TableQrRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  listActive() {
    return this.#db
      .select({
        id: diningTables.id,
        number: diningTables.number,
        label: diningTables.label,
        token: diningTables.qrToken,
      })
      .from(diningTables)
      .where(eq(diningTables.isActive, true))
      .orderBy(asc(diningTables.sortOrder), asc(diningTables.number));
  }

  async setToken(id: string, token: string): Promise<boolean> {
    const updated = await this.#db
      .update(diningTables)
      .set({ qrToken: token })
      .where(eq(diningTables.id, id))
      .returning({ id: diningTables.id });
    return updated.length > 0;
  }

  async labelForToken(token: string): Promise<string | null> {
    const [row] = await this.#db
      .select({ label: diningTables.label })
      .from(diningTables)
      .where(eq(diningTables.qrToken, token));
    return row?.label ?? null;
  }
}
