import {
  CHECK_STATUSES,
  ORDER_CHANNELS,
  ORDER_ITEM_OPTION_KINDS,
  MOVEMENT_KINDS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_MODES,
  PRINT_JOB_KINDS,
  PRINT_JOB_STATUSES,
  PRODUCT_KINDS,
  SUPPLY_UNITS,
  type Allergen,
  type ProductSize,
  type QuickNote,
  type TemplateComboSlot,
} from '@bigger/shared';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

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

/** Processed uploads; the files live in UPLOADS_DIR as `<id>-card.webp` / `<id>-thumb.webp`. */
export const images = sqliteTable('images', {
  id: id(),
  width: integer().notNull(),
  height: integer().notNull(),
  createdAt: timestamps.createdAt,
});

const imageColumns = () => ({
  imageId: text().references(() => images.id, { onDelete: 'set null' }),
  imageFocusY: integer().notNull().default(50),
});

export const categories = sqliteTable('categories', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  sortOrder: integer().notNull().default(0),
  ...imageColumns(),
  archivedAt: archivedAt(),
  ...timestamps,
});

export interface ProductTypeTemplate {
  sizes: Omit<ProductSize, 'id'>[];
  modifierGroupIds: string[];
  comboSlots: TemplateComboSlot[];
}

/** Templates that pre-fill a new product ("Ensalada armable"); products keep their own copy. */
export const productTypes = sqliteTable('product_types', {
  id: id(),
  name: text().notNull(),
  description: text().notNull().default(''),
  kind: text({ enum: PRODUCT_KINDS }).notNull().default('single'),
  template: text({ mode: 'json' }).$type<ProductTypeTemplate>().notNull(),
  ...timestamps,
});

export const products = sqliteTable(
  'products',
  {
    id: id(),
    categoryId: text()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    typeId: text().references(() => productTypes.id, { onDelete: 'set null' }),
    kind: text({ enum: PRODUCT_KINDS }).notNull().default('single'),
    name: text().notNull(),
    subtitle: text().notNull().default(''),
    description: text().notNull().default(''),
    priceClp: integer().notNull(),
    allergens: text({ mode: 'json' })
      .$type<Allergen[]>()
      .notNull()
      .$defaultFn(() => []),
    isAvailable: integer({ mode: 'boolean' }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...imageColumns(),
    isPromotion: integer({ mode: 'boolean' }).notNull().default(false),
    /** Calendar dates (`YYYY-MM-DD`) in the shop's time zone; null = open-ended. */
    promoStartsOn: text(),
    promoEndsOn: text(),
    promoDiscountPercent: integer().notNull().default(0),
    archivedAt: archivedAt(),
    ...timestamps,
  },
  (table) => [
    index('products_category_idx').on(table.categoryId),
    index('products_type_idx').on(table.typeId),
  ],
);

export const productSizes = sqliteTable(
  'product_sizes',
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    priceClp: integer().notNull(),
    position: integer().notNull(),
  },
  (table) => [index('product_sizes_product_idx').on(table.productId)],
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

/** Per-size override of a customization's rule; maxSelections = 0 hides it for that size. */
export const sizeGroupRules = sqliteTable(
  'size_group_rules',
  {
    sizeId: text()
      .notNull()
      .references(() => productSizes.id, { onDelete: 'cascade' }),
    groupId: text()
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    minSelections: integer().notNull(),
    maxSelections: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sizeId, table.groupId] }),
    index('size_group_rules_group_idx').on(table.groupId),
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
    isRequired: integer({ mode: 'boolean' }).notNull().default(true),
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

/**
 * A bill: every order of a table while it is occupied (or a single takeaway order) and the
 * payments made against it. `version` grows on every write so stale tablets cannot double-charge.
 */
export const checks = sqliteTable(
  'checks',
  {
    id: id(),
    tableId: text().references(() => diningTables.id, { onDelete: 'restrict' }),
    status: text({ enum: CHECK_STATUSES }).notNull().default('open'),
    version: integer().notNull().default(0),
    /** Equal split: in how many parts, and how many of them are already paid. */
    splitParts: integer(),
    splitPaidParts: integer().notNull().default(0),
    closedAt: integer({ mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [
    // At most one open check per table: later orders join it.
    uniqueIndex('checks_open_table_uq')
      .on(table.tableId)
      .where(sql`${table.status} = 'open' and ${table.tableId} is not null`),
    index('checks_status_idx').on(table.status),
  ],
);

/** Payments are never deleted: a mistake is voided with a reason, so reports keep the trail. */
export const payments = sqliteTable(
  'payments',
  {
    id: id(),
    checkId: text()
      .notNull()
      .references(() => checks.id, { onDelete: 'restrict' }),
    method: text({ enum: PAYMENT_METHODS }).notNull(),
    mode: text({ enum: PAYMENT_MODES }).notNull(),
    amountClp: integer().notNull(),
    tipClp: integer().notNull().default(0),
    receivedClp: integer(),
    voidedAt: integer({ mode: 'timestamp_ms' }),
    voidReason: text(),
    createdAt: timestamps.createdAt,
  },
  (table) => [index('payments_check_idx').on(table.checkId)],
);

/** Units of each order line paid by an item payment ("one of the two cafés"). */
export const paymentItems = sqliteTable(
  'payment_items',
  {
    paymentId: text()
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    orderItemId: text()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'restrict' }),
    quantity: integer().notNull(),
    amountClp: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.paymentId, table.orderItemId] }),
    index('payment_items_item_idx').on(table.orderItemId),
  ],
);

export const orders = sqliteTable(
  'orders',
  {
    id: id(),
    checkId: text()
      .notNull()
      .references(() => checks.id, { onDelete: 'restrict' }),
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
    index('orders_check_idx').on(table.checkId),
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

/**
 * Tickets waiting for, or already sent to, the thermal printer. Persisted so a power cut or a
 * restart of the API never loses a comanda that was still queued.
 */
export const printJobs = sqliteTable(
  'print_jobs',
  {
    id: id(),
    kind: text({ enum: PRINT_JOB_KINDS }).notNull(),
    orderId: text()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** Snapshot for the job list ("Mesa 2"), so it needs no join. */
    label: text().notNull(),
    /** 1 = the original comanda; reprints add one each. */
    copy: integer().notNull(),
    status: text({ enum: PRINT_JOB_STATUSES }).notNull().default('pending'),
    attempts: integer().notNull().default(0),
    lastError: text(),
    /** A failed attempt waits here before the next one. */
    nextAttemptAt: integer({ mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    printedAt: integer({ mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('print_jobs_copy_uq').on(table.orderId, table.kind, table.copy),
    index('print_jobs_due_idx').on(table.status, table.nextAttemptAt),
  ],
);

/** One closing per day: what the system expected in cash against what was counted. */
export const cashCloses = sqliteTable('cash_closes', {
  id: id(),
  /** Calendar date (`YYYY-MM-DD`) in the shop's time zone. */
  date: text().notNull().unique(),
  expectedCashClp: integer().notNull(),
  countedCashClp: integer().notNull(),
  differenceClp: integer().notNull(),
  note: text().notNull().default(''),
  createdAt: timestamps.createdAt,
});

export const suppliers = sqliteTable('suppliers', {
  id: id(),
  name: text().notNull(),
  phone: text(),
  archivedAt: archivedAt(),
  ...timestamps,
});

export const supplies = sqliteTable(
  'supplies',
  {
    id: id(),
    name: text().notNull(),
    unit: text({ enum: SUPPLY_UNITS }).notNull(),
    stock: real().notNull().default(0),
    minStock: real().notNull().default(0),
    costPerUnitClp: integer().notNull().default(0),
    supplierId: text().references(() => suppliers.id, { onDelete: 'set null' }),
    /** Earliest expiry of what is in stock (`YYYY-MM-DD`), if the supply expires. */
    expiresOn: text(),
    archivedAt: archivedAt(),
    ...timestamps,
  },
  (table) => [index('supplies_supplier_idx').on(table.supplierId)],
);

/** Every change to a supply's stock, so shrinkage and usage can be reported and audited. */
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: id(),
    supplyId: text()
      .notNull()
      .references(() => supplies.id, { onDelete: 'cascade' }),
    kind: text({ enum: MOVEMENT_KINDS }).notNull(),
    delta: real().notNull(),
    costClp: integer().notNull().default(0),
    note: text().notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (table) => [index('stock_movements_supply_idx').on(table.supplyId)],
);

/** What a unit of a product uses: selling it takes these quantities out of the stock. */
export const recipeItems = sqliteTable(
  'recipe_items',
  {
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    supplyId: text()
      .notNull()
      .references(() => supplies.id, { onDelete: 'cascade' }),
    quantity: real().notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.supplyId] })],
);
