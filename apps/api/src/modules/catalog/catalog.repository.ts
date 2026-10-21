import type { Category, MenuProduct, ProductFilter } from '@bigger/shared';
import { and, asc, eq, isNull, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { categories, products } from '../../db/schema.js';
import { buildCatalogProduct } from './catalog-product.js';
import { activeProduct, loadCatalogRelations, productColumns } from './catalog-relations.js';

/** Read side used by order taking and the public menu: archived rows never appear here. */
export interface CatalogRepository {
  listCategories: () => Promise<Category[]>;
  listProducts: (filter: ProductFilter) => Promise<MenuProduct[]>;
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
      .where(isNull(categories.archivedAt))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async listProducts(filter: ProductFilter): Promise<MenuProduct[]> {
    const conditions: SQL[] = [activeProduct(), isNull(categories.archivedAt)];
    if (filter.categoryId) conditions.push(eq(products.categoryId, filter.categoryId));
    if (filter.onlyAvailable) conditions.push(eq(products.isAvailable, true));

    const rows = await this.#db
      .select(productColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), asc(products.name));

    const relations = await loadCatalogRelations(this.#db, rows);
    return rows.map((row) => buildCatalogProduct(row, relations));
  }
}
