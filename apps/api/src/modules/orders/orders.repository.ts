import type { Order, OrderChannel, OrderItem, OrderStatus } from '@bigger/shared';
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { diningTables, orderItems, orders } from '../../db/schema.js';

export interface OrderQuery {
  statuses?: readonly OrderStatus[];
  channel?: OrderChannel;
}

export interface OrdersRepository {
  list: (query: OrderQuery) => Promise<Order[]>;
}

export class DrizzleOrdersRepository implements OrdersRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async list(query: OrderQuery): Promise<Order[]> {
    const conditions: SQL[] = [];
    if (query.statuses?.length) conditions.push(inArray(orders.status, [...query.statuses]));
    if (query.channel) conditions.push(eq(orders.channel, query.channel));

    const rows = await this.#db
      .select({ order: orders, tableLabel: diningTables.label })
      .from(orders)
      .leftJoin(diningTables, eq(orders.tableId, diningTables.id))
      .where(and(...conditions))
      .orderBy(asc(orders.createdAt));

    if (rows.length === 0) return [];

    const itemsByOrder = await this.#listItemsByOrder(rows.map(({ order }) => order.id));

    return rows.map(({ order, tableLabel }) => ({
      id: order.id,
      channel: order.channel,
      status: order.status,
      tableId: order.tableId,
      tableLabel,
      customerName: order.customerName,
      pickupAt: order.pickupAt?.toISOString() ?? null,
      items: itemsByOrder.get(order.id) ?? [],
      totalClp: order.totalClp,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }));
  }

  async #listItemsByOrder(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
    const items = await this.#db
      .select({
        orderId: orderItems.orderId,
        id: orderItems.id,
        productId: orderItems.productId,
        productName: orderItems.productName,
        unitPriceClp: orderItems.unitPriceClp,
        quantity: orderItems.quantity,
        quickNotes: orderItems.quickNotes,
        note: orderItems.note,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(orderItems.position));

    const grouped = new Map<string, OrderItem[]>();
    for (const { orderId, ...item } of items) {
      const bucket = grouped.get(orderId) ?? [];
      bucket.push(item);
      grouped.set(orderId, bucket);
    }
    return grouped;
  }
}
