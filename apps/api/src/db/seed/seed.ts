import { count } from 'drizzle-orm';
import type { AppDatabase } from '../client.js';
import { categories, diningTables, orderItems, orders, products } from '../schema.js';
import { SEED_CATEGORIES, SEED_DEMO_ORDERS, SEED_TABLE_COUNT } from './seed-data.js';

export interface SeedOptions {
  withDemoOrders: boolean;
  now?: Date;
}

export type SeedResult = 'seeded' | 'skipped';

const MINUTE_MS = 60_000;

/** Idempotent: a database that already has a catalog is left untouched. */
export function seedDatabase(db: AppDatabase, options: SeedOptions): SeedResult {
  const [existing] = db.select({ total: count() }).from(categories).all();
  if (existing && existing.total > 0) {
    return 'skipped';
  }

  const now = options.now ?? new Date();

  db.transaction((tx) => {
    const productsByName = new Map<string, { id: string; priceClp: number }>();

    SEED_CATEGORIES.forEach((seedCategory, categoryIndex) => {
      const [category] = tx
        .insert(categories)
        .values({ slug: seedCategory.slug, name: seedCategory.name, sortOrder: categoryIndex })
        .returning({ id: categories.id })
        .all();
      if (!category) throw new Error(`No se pudo crear la categoría ${seedCategory.slug}`);

      seedCategory.products.forEach((seedProduct, productIndex) => {
        const [product] = tx
          .insert(products)
          .values({ ...seedProduct, categoryId: category.id, sortOrder: productIndex })
          .returning({ id: products.id, priceClp: products.priceClp })
          .all();
        if (!product) throw new Error(`No se pudo crear el producto ${seedProduct.name}`);
        productsByName.set(seedProduct.name, product);
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
      const lines = seedOrder.items.map((item) => {
        const product = productsByName.get(item.productName);
        if (!product) throw new Error(`Producto de ejemplo desconocido: ${item.productName}`);
        return { ...item, product };
      });
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

      tx.insert(orderItems)
        .values(
          lines.map((line, position) => ({
            orderId: order.id,
            position,
            productId: line.product.id,
            productName: line.productName,
            unitPriceClp: line.product.priceClp,
            quantity: line.quantity,
            quickNotes: line.quickNotes ?? [],
          })),
        )
        .run();
    }
  });

  return 'seeded';
}
