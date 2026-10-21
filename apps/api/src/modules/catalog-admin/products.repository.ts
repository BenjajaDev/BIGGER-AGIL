import type { AdminProduct, ProductInput, ProductKind } from '@bigger/shared';
import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../../db/client.js';
import {
  categories,
  comboSlotOptions,
  comboSlots,
  productModifierGroups,
  products,
} from '../../db/schema.js';
import { buildCatalogProduct } from '../catalog/catalog-product.js';
import { loadCatalogRelations, productColumns } from '../catalog/catalog-relations.js';
import { toIso, type Transaction } from './transaction.js';

export interface ProductReference {
  id: string;
  name: string;
  kind: ProductKind;
  categoryId: string;
  archivedAt: Date | null;
}

export type CategoryState = 'active' | 'archived' | 'missing';

export interface ProductsAdminRepository {
  list: (includeArchived: boolean) => Promise<AdminProduct[]>;
  findById: (id: string) => Promise<AdminProduct | null>;
  findReferences: (ids: readonly string[]) => Promise<ProductReference[]>;
  listActiveInCategory: (categoryId: string) => Promise<ProductReference[]>;
  findActiveCombosIncluding: (productId: string) => Promise<{ id: string; name: string }[]>;
  categoryState: (categoryId: string) => Promise<CategoryState>;
  create: (input: ProductInput) => Promise<string>;
  update: (id: string, input: ProductInput) => Promise<void>;
  setArchivedAt: (id: string, archivedAt: Date | null) => Promise<void>;
}

const referenceColumns = {
  id: products.id,
  name: products.name,
  kind: products.kind,
  categoryId: products.categoryId,
  archivedAt: products.archivedAt,
};

function productRow(input: ProductInput) {
  return {
    categoryId: input.categoryId,
    kind: input.kind,
    name: input.name,
    description: input.description,
    priceClp: input.priceClp,
    // A combo's allergens are derived from its options on every read.
    allergens: input.kind === 'single' ? input.allergens : [],
    isAvailable: input.isAvailable,
  };
}

/** Replaces customizations or combo slots: the form always sends the full configuration. */
function writeRelations(tx: Transaction, productId: string, input: ProductInput): void {
  tx.delete(productModifierGroups).where(eq(productModifierGroups.productId, productId)).run();
  tx.delete(comboSlots).where(eq(comboSlots.comboId, productId)).run();

  if (input.kind === 'single') {
    if (input.modifierGroupIds.length === 0) return;
    tx.insert(productModifierGroups)
      .values(input.modifierGroupIds.map((groupId, position) => ({ productId, groupId, position })))
      .run();
    return;
  }

  input.comboSlots.forEach((slot, slotPosition) => {
    const slotId = randomUUID();
    tx.insert(comboSlots)
      .values({ id: slotId, comboId: productId, name: slot.name, position: slotPosition })
      .run();
    tx.insert(comboSlotOptions)
      .values(
        slot.options.map((option, position) => ({
          slotId,
          productId: option.productId,
          extraPriceClp: option.extraPriceClp,
          position,
        })),
      )
      .run();
  });
}

export class DrizzleProductsAdminRepository implements ProductsAdminRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async list(includeArchived: boolean): Promise<AdminProduct[]> {
    const rows = await this.#db
      .select({ ...productColumns, archivedAt: products.archivedAt })
      .from(products)
      .where(includeArchived ? undefined : isNull(products.archivedAt))
      .orderBy(asc(products.sortOrder), asc(products.name));

    const relations = await loadCatalogRelations(this.#db, rows);
    return rows.map(({ archivedAt, ...row }) => {
      const product = buildCatalogProduct(row, relations);
      return {
        ...row,
        allergens: product.allergens,
        archivedAt: toIso(archivedAt),
        modifierGroupIds: product.modifierGroups.map((group) => group.id),
        comboSlots: product.comboSlots,
      };
    });
  }

  async findById(id: string): Promise<AdminProduct | null> {
    const all = await this.list(true);
    return all.find((product) => product.id === id) ?? null;
  }

  async findReferences(ids: readonly string[]): Promise<ProductReference[]> {
    if (ids.length === 0) return [];
    return this.#db
      .select(referenceColumns)
      .from(products)
      .where(inArray(products.id, [...ids]));
  }

  async listActiveInCategory(categoryId: string): Promise<ProductReference[]> {
    return this.#db
      .select(referenceColumns)
      .from(products)
      .where(and(eq(products.categoryId, categoryId), isNull(products.archivedAt)));
  }

  async findActiveCombosIncluding(productId: string): Promise<{ id: string; name: string }[]> {
    return this.#db
      .selectDistinct({ id: products.id, name: products.name })
      .from(comboSlotOptions)
      .innerJoin(comboSlots, eq(comboSlotOptions.slotId, comboSlots.id))
      .innerJoin(products, eq(comboSlots.comboId, products.id))
      .where(and(eq(comboSlotOptions.productId, productId), isNull(products.archivedAt)));
  }

  async categoryState(categoryId: string): Promise<CategoryState> {
    const [row] = await this.#db
      .select({ archivedAt: categories.archivedAt })
      .from(categories)
      .where(eq(categories.id, categoryId));
    if (!row) return 'missing';
    return row.archivedAt === null ? 'active' : 'archived';
  }

  async create(input: ProductInput): Promise<string> {
    const id = randomUUID();
    const sortOrder = await this.#nextSortOrder(input.categoryId);
    this.#db.transaction((tx) => {
      tx.insert(products)
        .values({ id, ...productRow(input), sortOrder })
        .run();
      writeRelations(tx, id, input);
    });
    return id;
  }

  async update(id: string, input: ProductInput): Promise<void> {
    const [current] = await this.#db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, id));
    const movedCategory = current !== undefined && current.categoryId !== input.categoryId;
    const sortOrder = movedCategory ? await this.#nextSortOrder(input.categoryId) : undefined;

    this.#db.transaction((tx) => {
      tx.update(products)
        .set({ ...productRow(input), ...(sortOrder === undefined ? {} : { sortOrder }) })
        .where(eq(products.id, id))
        .run();
      writeRelations(tx, id, input);
    });
  }

  async setArchivedAt(id: string, archivedAt: Date | null): Promise<void> {
    await this.#db.update(products).set({ archivedAt }).where(eq(products.id, id));
  }

  async #nextSortOrder(categoryId: string): Promise<number> {
    const [last] = await this.#db
      .select({ value: max(products.sortOrder) })
      .from(products)
      .where(eq(products.categoryId, categoryId));
    return (last?.value ?? -1) + 1;
  }
}
