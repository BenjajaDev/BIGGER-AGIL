import { ORDER_CHANNELS, ORDER_STATUSES, type Allergen, type QuickNote } from '@bigger/shared';
import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer({ mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

export const categories = sqliteTable('categories', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

export const products = sqliteTable(
  'products',
  {
    id: id(),
    categoryId: text()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    priceClp: integer().notNull(),
    allergens: text({ mode: 'json' })
      .$type<Allergen[]>()
      .notNull()
      .$defaultFn(() => []),
    isAvailable: integer({ mode: 'boolean' }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (table) => [index('products_category_idx').on(table.categoryId)],
);

export const diningTables = sqliteTable('dining_tables', {
  id: id(),
  number: integer().notNull().unique(),
  label: text().notNull(),
  sortOrder: integer().notNull().default(0),
  isActive: integer({ mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const orders = sqliteTable(
  'orders',
  {
    id: id(),
    channel: text({ enum: ORDER_CHANNELS }).notNull(),
    status: text({ enum: ORDER_STATUSES }).notNull().default('new'),
    tableId: text().references(() => diningTables.id, { onDelete: 'restrict' }),
    customerName: text(),
    pickupAt: integer({ mode: 'timestamp_ms' }),
    totalClp: integer().notNull(),
    ...timestamps,
  },
  (table) => [
    index('orders_status_idx').on(table.status),
    index('orders_table_idx').on(table.tableId),
  ],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    /** Snapshot: the comanda keeps the name and price it was sold with. */
    productName: text().notNull(),
    /** Line order as entered on the comanda. */
    position: integer().notNull(),
    unitPriceClp: integer().notNull(),
    quantity: integer().notNull(),
    quickNotes: text({ mode: 'json' })
      .$type<QuickNote[]>()
      .notNull()
      .$defaultFn(() => []),
    note: text(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);
