import { OPEN_ORDER_STATUSES, type Order, type TableOverview } from '@bigger/shared';
import type { OrdersRepository } from '../orders/orders.repository.js';
import { buildTableOverview } from './table-overview.js';
import type { TablesRepository } from './tables.repository.js';

export class TablesService {
  readonly #tables: TablesRepository;
  readonly #orders: OrdersRepository;

  constructor(tables: TablesRepository, orders: OrdersRepository) {
    this.#tables = tables;
    this.#orders = orders;
  }

  async listOverview(): Promise<TableOverview[]> {
    const [tables, openOrders] = await Promise.all([
      this.#tables.listActive(),
      this.#orders.list({ statuses: OPEN_ORDER_STATUSES, channel: 'dine-in' }),
    ]);

    const ordersByTable = new Map<string, Order[]>();
    for (const order of openOrders) {
      if (order.tableId === null) continue;
      const bucket = ordersByTable.get(order.tableId) ?? [];
      bucket.push(order);
      ordersByTable.set(order.tableId, bucket);
    }

    return tables.map((table) => buildTableOverview(table, ordersByTable.get(table.id) ?? []));
  }
}
