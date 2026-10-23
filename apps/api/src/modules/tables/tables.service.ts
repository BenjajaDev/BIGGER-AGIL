import type { Check, TableOverview } from '@bigger/shared';
import { buildTableOverview } from './table-overview.js';
import type { TablesRepository } from './tables.repository.js';

/** The open checks of the tables (one per occupied table). */
export interface OpenTableChecks {
  listOpenForTables: () => Promise<Check[]>;
}

export class TablesService {
  readonly #tables: TablesRepository;
  readonly #checks: OpenTableChecks;

  constructor(tables: TablesRepository, checks: OpenTableChecks) {
    this.#tables = tables;
    this.#checks = checks;
  }

  async listOverview(): Promise<TableOverview[]> {
    const [tables, openChecks] = await Promise.all([
      this.#tables.listActive(),
      this.#checks.listOpenForTables(),
    ]);
    const checkByTable = new Map(openChecks.map((check) => [check.tableId, check]));
    return tables.map((table) => buildTableOverview(table, checkByTable.get(table.id) ?? null));
  }
}
