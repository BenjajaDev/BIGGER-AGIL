import { describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { openDatabase, runMigrations } from '../client.js';
import { categories, orders, products } from '../schema.js';
import { seedDatabase } from './seed.js';

function freshDatabase() {
  const connection = openDatabase(':memory:');
  runMigrations(connection.db);
  return connection;
}

const total = (rows: { total: number }[]) => rows[0]?.total ?? 0;

describe('seedDatabase', () => {
  it('loads the catalog once and leaves an existing database untouched', () => {
    const { db, close } = freshDatabase();
    expect(seedDatabase(db, { withDemoOrders: false })).toBe('seeded');
    expect(seedDatabase(db, { withDemoOrders: false })).toBe('skipped');
    expect(total(db.select({ total: count() }).from(products).all())).toBe(36);
    close();
  });

  it('with reset replaces old products and orders by the current catalog', () => {
    const { db, close } = freshDatabase();
    seedDatabase(db, { withDemoOrders: true });
    const [category] = db.select({ id: categories.id }).from(categories).limit(1).all();
    db.insert(products)
      .values({ categoryId: category?.id ?? '', name: 'Producto de ejemplo', priceClp: 1000 })
      .run();

    expect(seedDatabase(db, { withDemoOrders: false, reset: true })).toBe('reset');

    expect(total(db.select({ total: count() }).from(products).all())).toBe(36);
    expect(
      db.select().from(products).where(eq(products.name, 'Producto de ejemplo')).all(),
    ).toEqual([]);
    expect(total(db.select({ total: count() }).from(orders).all())).toBe(0);
    close();
  });
});
