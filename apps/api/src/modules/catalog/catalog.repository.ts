import type { Category, Product, ProductFilter } from '@bigger/shared';
import { and, asc, eq, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { categories, products } from '../../db/schema.js';

export interface CatalogRepository {
  listCategories: () => Promise<Category[]>;
  listProducts: (filter: ProductFilter) => Promise<Product[]>;
}

export class DrizzleCatalogRepository implements CatalogRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async listCategories(): Promise<Category[]> {
    return this.#db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async listProducts(filter: ProductFilter): Promise<Product[]> {
    const conditions: SQL[] = [];
    if (filter.categoryId) conditions.push(eq(products.categoryId, filter.categoryId));
    if (filter.onlyAvailable) conditions.push(eq(products.isAvailable, true));

    return this.#db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        priceClp: products.priceClp,
        allergens: products.allergens,
        isAvailable: products.isAvailable,
        sortOrder: products.sortOrder,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), asc(products.name));
  }
}
