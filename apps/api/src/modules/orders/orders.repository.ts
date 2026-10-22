import type {
  ComboSlot,
  ModifierGroup,
  Order,
  OrderChannel,
  OrderItem,
  OrderItemOption,
  OrderItemOptionKind,
  OrderStatus,
  ProductKind,
  ProductSize,
  QuickNote,
} from '@bigger/shared';
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../../db/client.js';
import { diningTables, orderItemOptions, orderItems, orders, products } from '../../db/schema.js';
import { loadCatalogRelations } from '../catalog/catalog-relations.js';

export interface OrderQuery {
  statuses?: readonly OrderStatus[];
  channel?: OrderChannel;
}

/** Catalog data the order needs to price, validate and snapshot each line at sale time. */
export interface OrderableProduct {
  id: string;
  name: string;
  kind: ProductKind;
  priceClp: number;
  isAvailable: boolean;
  archivedAt: Date | null;
  sizes: ProductSize[];
  modifierGroups: ModifierGroup[];
  comboSlots: ComboSlot[];
}

/** A chosen option already resolved to its sale-time snapshot, ready to persist. */
export interface NewOrderItemOption {
  kind: OrderItemOptionKind;
  label: string;
  name: string;
  priceDeltaClp: number;
  referenceId: string;
}

/** A priced line ready to persist: the service has already resolved names and prices. */
export interface NewOrderItem {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  quickNotes: QuickNote[];
  note: string | null;
  options: NewOrderItemOption[];
}

export interface NewOrder {
  channel: OrderChannel;
  tableId: string | null;
  customerName: string | null;
  pickupAt: Date | null;
  totalClp: number;
  items: readonly NewOrderItem[];
}

export interface OrdersRepository {
  list: (query: OrderQuery) => Promise<Order[]>;
  productsForOrder: (ids: readonly string[]) => Promise<OrderableProduct[]>;
  create: (order: NewOrder) => Promise<Order>;
}

type OrderRow = typeof orders.$inferSelect;

function toOrder(order: OrderRow, tableLabel: string | null, items: OrderItem[]): Order {
  return {
    id: order.id,
    channel: order.channel,
    status: order.status,
    tableId: order.tableId,
    tableLabel,
    customerName: order.customerName,
    pickupAt: order.pickupAt?.toISOString() ?? null,
    items,
    totalClp: order.totalClp,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
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

    return rows.map(({ order, tableLabel }) =>
      toOrder(order, tableLabel, itemsByOrder.get(order.id) ?? []),
    );
  }

  async productsForOrder(ids: readonly string[]): Promise<OrderableProduct[]> {
    if (ids.length === 0) return [];
    const rows = await this.#db
      .select({
        id: products.id,
        name: products.name,
        kind: products.kind,
        priceClp: products.priceClp,
        isAvailable: products.isAvailable,
        archivedAt: products.archivedAt,
      })
      .from(products)
      .where(inArray(products.id, [...ids]));

    const relations = await loadCatalogRelations(this.#db, rows);
    return rows.map((row) => ({
      ...row,
      sizes: relations.sizesByProduct.get(row.id) ?? [],
      modifierGroups: relations.modifierGroupsByProduct.get(row.id) ?? [],
      comboSlots: relations.comboSlotsByProduct.get(row.id) ?? [],
    }));
  }

  async create(order: NewOrder): Promise<Order> {
    const orderId = randomUUID();
    // Line ids are generated up front so each line's options can reference it.
    const lines = order.items.map((item, position) => ({ id: randomUUID(), position, item }));

    this.#db.transaction((tx) => {
      tx.insert(orders)
        .values({
          id: orderId,
          channel: order.channel,
          tableId: order.tableId,
          customerName: order.customerName,
          pickupAt: order.pickupAt,
          totalClp: order.totalClp,
        })
        .run();
      tx.insert(orderItems)
        .values(
          lines.map(({ id, position, item }) => ({
            id,
            orderId,
            productId: item.productId,
            productName: item.productName,
            position,
            unitPriceClp: item.unitPriceClp,
            quantity: item.quantity,
            quickNotes: item.quickNotes,
            note: item.note,
          })),
        )
        .run();

      const optionRows = lines.flatMap(({ id, item }) =>
        item.options.map((option, position) => ({
          orderItemId: id,
          kind: option.kind,
          label: option.label,
          name: option.name,
          priceDeltaClp: option.priceDeltaClp,
          position,
          referenceId: option.referenceId,
        })),
      );
      if (optionRows.length > 0) tx.insert(orderItemOptions).values(optionRows).run();
    });
    return this.#findById(orderId);
  }

  async #findById(id: string): Promise<Order> {
    const [row] = await this.#db
      .select({ order: orders, tableLabel: diningTables.label })
      .from(orders)
      .leftJoin(diningTables, eq(orders.tableId, diningTables.id))
      .where(eq(orders.id, id));
    if (!row) throw new Error(`La orden ${id} no existe tras crearla`);

    const itemsByOrder = await this.#listItemsByOrder([id]);
    return toOrder(row.order, row.tableLabel, itemsByOrder.get(id) ?? []);
  }

  async #listItemsByOrder(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
    const rows = await this.#db
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

    const optionsByItem = await this.#listOptionsByItem(rows.map((row) => row.id));

    const grouped = new Map<string, OrderItem[]>();
    for (const { orderId, ...item } of rows) {
      const bucket = grouped.get(orderId) ?? [];
      bucket.push({ ...item, options: optionsByItem.get(item.id) ?? [] });
      grouped.set(orderId, bucket);
    }
    return grouped;
  }

  async #listOptionsByItem(itemIds: string[]): Promise<Map<string, OrderItemOption[]>> {
    if (itemIds.length === 0) return new Map();
    const rows = await this.#db
      .select({
        orderItemId: orderItemOptions.orderItemId,
        kind: orderItemOptions.kind,
        label: orderItemOptions.label,
        name: orderItemOptions.name,
        priceDeltaClp: orderItemOptions.priceDeltaClp,
      })
      .from(orderItemOptions)
      .where(inArray(orderItemOptions.orderItemId, itemIds))
      .orderBy(asc(orderItemOptions.position));

    const grouped = new Map<string, OrderItemOption[]>();
    for (const { orderItemId, ...option } of rows) {
      const bucket = grouped.get(orderItemId) ?? [];
      bucket.push(option);
      grouped.set(orderItemId, bucket);
    }
    return grouped;
  }
}
