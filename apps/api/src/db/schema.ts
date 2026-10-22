import {
  ORDER_CHANNELS,
  ORDER_ITEM_OPTION_KINDS,
  ORDER_STATUSES,
  PRODUCT_KINDS,
  type Allergen,
  type QuickNote,
} from '@bigger/shared';
import { randomUUID } from 'node:crypto';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

/** Soft delete: archived rows disappear from the menu but keep past comandas intact. */
const archivedAt = () => integer({ mode: 'timestamp_ms' });

export const categories = sqliteTable('categories', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  sortOrder: integer().notNull().default(0),
  archivedAt: archivedAt(),
  ...timestamps,
});

export const products = sqliteTable(
  'products',
  {
    id: id(),
    categoryId: text()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    kind: text({ enum: PRODUCT_KINDS }).notNull().default('single'),
    name: text().notNull(),
    description: text().notNull().default(''),
    priceClp: integer().notNull(),
    allergens: text({ mode: 'json' })
      .$type<Allergen[]>()
      .notNull()
      .$defaultFn(() => []),
    isAvailable: integer({ mode: 'boolean' }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    archivedAt: archivedAt(),
    ...timestamps,
  },
  (table) => [index('products_category_idx').on(table.categoryId)],
);

export const modifierGroups = sqliteTable('modifier_groups', {
  id: id(),
  name: text().notNull(),
  minSelections: integer().notNull().default(0),
  maxSelections: integer().notNull().default(1),
  ...timestamps,
});

export const modifierOptions = sqliteTable(
  'modifier_options',
  {
    id: id(),
    groupId: text()
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    priceDeltaClp: integer().notNull().default(0),
    isAvailable: integer({ mode: 'boolean' }).notNull().default(true),
    position: integer().notNull(),
  },
  (table) => [index('modifier_options_group_idx').on(table.groupId)],
);

export const productModifierGroups = sqliteTable(
  'product_modifier_groups',
  {
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    groupId: text()
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.groupId] }),
    index('product_modifier_groups_group_idx').on(table.groupId),
  ],
);

export const comboSlots = sqliteTable(
  'combo_slots',
  {
    id: id(),
    comboId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    position: integer().notNull(),
  },
  (table) => [index('combo_slots_combo_idx').on(table.comboId)],
);

export const comboSlotOptions = sqliteTable(
  'combo_slot_options',
  {
    slotId: text()
      .notNull()
      .references(() => comboSlots.id, { onDelete: 'cascade' }),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    extraPriceClp: integer().notNull().default(0),
    position: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.slotId, table.productId] }),
    index('combo_slot_options_product_idx').on(table.productId),
  ],
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

export const orderItemOptions = sqliteTable(
  'order_item_options',
  {
    id: id(),
    orderItemId: text()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    kind: text({ enum: ORDER_ITEM_OPTION_KINDS }).notNull(),
    /** Snapshot of the group ("Tipo de leche") or combo slot ("Café a elección"). */
    label: text().notNull(),
    /** Snapshot of the chosen option ("Almendra") or product ("Cortado"). */
    name: text().notNull(),
    priceDeltaClp: integer().notNull().default(0),
    position: integer().notNull(),
    /** Soft reference to the modifier option / combo product; no FK keeps the menu editable. */
    referenceId: text(),
  },
  (table) => [index('order_item_options_item_idx').on(table.orderItemId)],
);
