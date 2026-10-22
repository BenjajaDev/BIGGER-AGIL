import type { AdminCategory, ImageRefInput } from '@bigger/shared';
import { and, asc, count, eq, isNull, max } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { categories, images, products } from '../../db/schema.js';
import { categoryRowColumns, toCategory } from '../catalog/product-row.js';
import { toIso } from './transaction.js';

export interface CategoryRecord {
  id: string;
  name: string;
  archivedAt: Date | null;
}

export interface CategoryWrite {
  name: string;
  image: ImageRefInput | null;
}

const imageValues = (image: ImageRefInput | null) => ({
  imageId: image?.imageId ?? null,
  imageFocusY: image?.focusY ?? 50,
});

export interface CategoriesAdminRepository {
  list: (includeArchived: boolean) => Promise<AdminCategory[]>;
  findById: (id: string) => Promise<AdminCategory | null>;
  listRecords: () => Promise<CategoryRecord[]>;
  slugExists: (slug: string) => Promise<boolean>;
  create: (values: CategoryWrite & { slug: string }) => Promise<string>;
  update: (id: string, values: CategoryWrite) => Promise<void>;
  setArchivedAt: (id: string, archivedAt: Date | null) => Promise<void>;
}

export class DrizzleCategoriesAdminRepository implements CategoriesAdminRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async list(includeArchived: boolean): Promise<AdminCategory[]> {
    const rows = await this.#db
      .select({
        ...categoryRowColumns,
        archivedAt: categories.archivedAt,
        activeProductCount: count(products.id),
      })
      .from(categories)
      .leftJoin(images, eq(categories.imageId, images.id))
      .leftJoin(products, and(eq(products.categoryId, categories.id), isNull(products.archivedAt)))
      .where(includeArchived ? undefined : isNull(categories.archivedAt))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return rows.map(({ archivedAt, activeProductCount, ...row }) => ({
      ...toCategory(row),
      archivedAt: toIso(archivedAt),
      activeProductCount,
    }));
  }

  async findById(id: string): Promise<AdminCategory | null> {
    const all = await this.list(true);
    return all.find((category) => category.id === id) ?? null;
  }

  async listRecords(): Promise<CategoryRecord[]> {
    return this.#db
      .select({ id: categories.id, name: categories.name, archivedAt: categories.archivedAt })
      .from(categories);
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await this.#db
      .select({ total: count() })
      .from(categories)
      .where(eq(categories.slug, slug));
    return (row?.total ?? 0) > 0;
  }

  async create({ name, slug, image }: CategoryWrite & { slug: string }): Promise<string> {
    const [last] = await this.#db.select({ value: max(categories.sortOrder) }).from(categories);
    const [created] = await this.#db
      .insert(categories)
      .values({ name, slug, sortOrder: (last?.value ?? -1) + 1, ...imageValues(image) })
      .returning({ id: categories.id });
    if (!created) throw new Error('No se pudo crear la categoría');
    return created.id;
  }

  async update(id: string, { name, image }: CategoryWrite): Promise<void> {
    await this.#db
      .update(categories)
      .set({ name, ...imageValues(image) })
      .where(eq(categories.id, id));
  }

  async setArchivedAt(id: string, archivedAt: Date | null): Promise<void> {
    await this.#db.update(categories).set({ archivedAt }).where(eq(categories.id, id));
  }
}
