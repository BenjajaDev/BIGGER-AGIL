import { count } from 'drizzle-orm';
import type { AppDatabase } from '../client.js';
import {
  categories,
  comboSlotOptions,
  comboSlots,
  diningTables,
  modifierGroups,
  modifierOptions,
  orderItemOptions,
  orderItems,
  orders,
  productModifierGroups,
  products,
  productSizes,
  productTypes,
  sizeGroupRules,
} from '../schema.js';
import {
  SEED_CATEGORIES,
  SEED_COMBOS,
  SEED_DEMO_ORDERS,
  SEED_MODIFIER_GROUPS,
  SEED_PRODUCT_TYPES,
  SEED_TABLE_COUNT,
  type SeedPromotion,
  type SeedSize,
} from './seed-data.js';

export interface SeedOptions {
  withDemoOrders: boolean;
  now?: Date;
}

export type SeedResult = 'seeded' | 'skipped';

const MINUTE_MS = 60_000;

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

interface SeededProduct {
  id: string;
  priceClp: number;
  firstSize: { id: string; name: string } | null;
}

function lookup<T>(map: ReadonlyMap<string, T>, name: string, what: string): T {
  const value = map.get(name);
  if (value === undefined) throw new Error(`${what} de ejemplo desconocido: ${name}`);
  return value;
}

function promotionColumns(promotion: SeedPromotion | undefined) {
  return {
    isPromotion: promotion !== undefined,
    promoStartsOn: promotion?.startsOn ?? null,
    promoEndsOn: promotion?.endsOn ?? null,
  };
}

function toRules(size: SeedSize, groupIds: ReadonlyMap<string, string>) {
  return (size.rules ?? []).map((rule) => ({
    groupId: lookup(groupIds, rule.group, 'Grupo'),
    minSelections: rule.min,
    maxSelections: rule.max,
  }));
}

function insertSizes(
  tx: Transaction,
  productId: string,
  sizes: readonly SeedSize[],
  groupIds: ReadonlyMap<string, string>,
): { id: string; name: string } | null {
  const created = sizes.map((size, position) => {
    const [row] = tx
      .insert(productSizes)
      .values({ productId, name: size.name, priceClp: size.priceClp, position })
      .returning({ id: productSizes.id, name: productSizes.name })
      .all();
    if (!row) throw new Error(`No se pudo crear el tamaño ${size.name}`);
    const rules = toRules(size, groupIds);
    if (rules.length > 0) {
      tx.insert(sizeGroupRules)
        .values(rules.map((rule) => ({ sizeId: row.id, ...rule })))
        .run();
    }
    return row;
  });
  return created[0] ?? null;
}

/** Idempotent: a database that already has a catalog is left untouched. */
export function seedDatabase(db: AppDatabase, options: SeedOptions): SeedResult {
  const [existing] = db.select({ total: count() }).from(categories).all();
  if (existing && existing.total > 0) {
    return 'skipped';
  }

  const now = options.now ?? new Date();

  db.transaction((tx) => {
    const groupIds = new Map<string, string>();
    for (const group of SEED_MODIFIER_GROUPS) {
      const [created] = tx
        .insert(modifierGroups)
        .values({
          name: group.name,
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
        })
        .returning({ id: modifierGroups.id })
        .all();
      if (!created) throw new Error(`No se pudo crear la personalización ${group.name}`);
      tx.insert(modifierOptions)
        .values(
          group.options.map((option, position) => ({ ...option, groupId: created.id, position })),
        )
        .run();
      groupIds.set(group.name, created.id);
    }

    const typeIds = new Map<string, string>();
    for (const type of SEED_PRODUCT_TYPES) {
      const [created] = tx
        .insert(productTypes)
        .values({
          name: type.name,
          description: type.description,
          kind: type.kind,
          template: {
            sizes: type.sizes.map((size) => ({
              name: size.name,
              priceClp: size.priceClp,
              groupRules: toRules(size, groupIds),
            })),
            modifierGroupIds: type.groups.map((name) => lookup(groupIds, name, 'Grupo')),
            comboSlots: type.comboSlots,
          },
        })
        .returning({ id: productTypes.id })
        .all();
      if (!created) throw new Error(`No se pudo crear el tipo ${type.name}`);
      typeIds.set(type.name, created.id);
    }

    const categoryIds = new Map<string, string>();
    const productsByName = new Map<string, SeededProduct>();

    SEED_CATEGORIES.forEach((seedCategory, categoryIndex) => {
      const [category] = tx
        .insert(categories)
        .values({ slug: seedCategory.slug, name: seedCategory.name, sortOrder: categoryIndex })
        .returning({ id: categories.id })
        .all();
      if (!category) throw new Error(`No se pudo crear la categoría ${seedCategory.slug}`);
      categoryIds.set(seedCategory.slug, category.id);

      seedCategory.products.forEach((seedProduct, productIndex) => {
        const sizes = seedProduct.sizes ?? [];
        const priceClp =
          sizes.length > 0 ? Math.min(...sizes.map((size) => size.priceClp)) : seedProduct.priceClp;
        const [product] = tx
          .insert(products)
          .values({
            categoryId: category.id,
            typeId: seedProduct.type ? lookup(typeIds, seedProduct.type, 'Tipo') : null,
            name: seedProduct.name,
            subtitle: seedProduct.subtitle ?? '',
            description: seedProduct.description,
            priceClp,
            allergens: seedProduct.allergens,
            sortOrder: productIndex,
            ...promotionColumns(seedProduct.promotion),
          })
          .returning({ id: products.id })
          .all();
        if (!product) throw new Error(`No se pudo crear el producto ${seedProduct.name}`);

        const groups = seedProduct.groups ?? [];
        if (groups.length > 0) {
          tx.insert(productModifierGroups)
            .values(
              groups.map((name, position) => ({
                productId: product.id,
                groupId: lookup(groupIds, name, 'Grupo'),
                position,
              })),
            )
            .run();
        }
        const firstSize = insertSizes(tx, product.id, sizes, groupIds);
        productsByName.set(seedProduct.name, { id: product.id, priceClp, firstSize });
      });
    });

    SEED_COMBOS.forEach((combo, comboIndex) => {
      const [created] = tx
        .insert(products)
        .values({
          categoryId: lookup(categoryIds, combo.categorySlug, 'Categoría'),
          typeId: combo.type ? lookup(typeIds, combo.type, 'Tipo') : null,
          kind: 'combo',
          name: combo.name,
          subtitle: combo.subtitle ?? '',
          description: combo.description,
          priceClp: combo.priceClp,
          sortOrder: comboIndex,
          ...promotionColumns(combo.promotion),
        })
        .returning({ id: products.id })
        .all();
      if (!created) throw new Error(`No se pudo crear el combo ${combo.name}`);

      combo.slots.forEach((slot, slotPosition) => {
        const [createdSlot] = tx
          .insert(comboSlots)
          .values({
            comboId: created.id,
            name: slot.name,
            isRequired: slot.isRequired,
            position: slotPosition,
          })
          .returning({ id: comboSlots.id })
          .all();
        if (!createdSlot) throw new Error(`No se pudo crear el espacio ${slot.name}`);
        tx.insert(comboSlotOptions)
          .values(
            slot.options.map((option, position) => ({
              slotId: createdSlot.id,
              productId: lookup(productsByName, option.productName, 'Producto').id,
              extraPriceClp: option.extraPriceClp,
              position,
            })),
          )
          .run();
      });
    });

    const tableIdsByNumber = new Map<number, string>();
    for (let number = 1; number <= SEED_TABLE_COUNT; number += 1) {
      const [table] = tx
        .insert(diningTables)
        .values({ number, label: `Mesa ${number}`, sortOrder: number })
        .returning({ id: diningTables.id })
        .all();
      if (!table) throw new Error(`No se pudo crear la mesa ${number}`);
      tableIdsByNumber.set(number, table.id);
    }

    if (!options.withDemoOrders) return;

    for (const seedOrder of SEED_DEMO_ORDERS) {
      const lines = seedOrder.items.map((item) => ({
        ...item,
        product: lookup(productsByName, item.productName, 'Producto'),
      }));
      const createdAt = new Date(now.getTime() - seedOrder.minutesAgo * MINUTE_MS);
      const [order] = tx
        .insert(orders)
        .values({
          channel: seedOrder.channel,
          status: seedOrder.status,
          tableId:
            seedOrder.tableNumber === undefined
              ? null
              : (tableIdsByNumber.get(seedOrder.tableNumber) ?? null),
          customerName: seedOrder.customerName ?? null,
          pickupAt:
            seedOrder.pickupInMinutes === undefined
              ? null
              : new Date(now.getTime() + seedOrder.pickupInMinutes * MINUTE_MS),
          totalClp: lines.reduce((sum, line) => sum + line.product.priceClp * line.quantity, 0),
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: orders.id })
        .all();
      if (!order) throw new Error('No se pudo crear el pedido de ejemplo');

      lines.forEach((line, position) => {
        const [item] = tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            position,
            productId: line.product.id,
            productName: line.productName,
            unitPriceClp: line.product.priceClp,
            quantity: line.quantity,
            quickNotes: line.quickNotes ?? [],
          })
          .returning({ id: orderItems.id })
          .all();
        const size = line.product.firstSize;
        if (item && size) {
          tx.insert(orderItemOptions)
            .values({
              orderItemId: item.id,
              kind: 'size',
              label: 'Tamaño',
              name: size.name,
              priceDeltaClp: 0,
              position: 0,
              referenceId: size.id,
            })
            .run();
        }
      });
    }
  });

  return 'seeded';
}
