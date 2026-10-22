import type { ProductType, ProductTypeInput } from '@bigger/shared';
import { asc, count, eq, isNull, and } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { products, productTypes, type ProductTypeTemplate } from '../../db/schema.js';

export interface ProductTypesRepository {
  list: () => Promise<ProductType[]>;
  findById: (id: string) => Promise<ProductType | null>;
  create: (input: ProductTypeInput) => Promise<string>;
  update: (id: string, input: ProductTypeInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

function toTemplate(input: ProductTypeInput): ProductTypeTemplate {
  return {
    sizes: input.sizes.map(({ name, priceClp, groupRules }) => ({ name, priceClp, groupRules })),
    modifierGroupIds: input.modifierGroupIds,
    comboSlots: input.comboSlots,
  };
}

export class DrizzleProductTypesRepository implements ProductTypesRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async list(): Promise<ProductType[]> {
    const rows = await this.#db
      .select({
        id: productTypes.id,
        name: productTypes.name,
        description: productTypes.description,
        kind: productTypes.kind,
        template: productTypes.template,
        productCount: count(products.id),
      })
      .from(productTypes)
      .leftJoin(products, and(eq(products.typeId, productTypes.id), isNull(products.archivedAt)))
      .groupBy(productTypes.id)
      .orderBy(asc(productTypes.name));

    return rows.map(({ template, ...row }) => ({ ...row, ...template }));
  }

  async findById(id: string): Promise<ProductType | null> {
    const all = await this.list();
    return all.find((type) => type.id === id) ?? null;
  }

  async create(input: ProductTypeInput): Promise<string> {
    const [created] = await this.#db
      .insert(productTypes)
      .values({
        name: input.name,
        description: input.description,
        kind: input.kind,
        template: toTemplate(input),
      })
      .returning({ id: productTypes.id });
    if (!created) throw new Error('No se pudo crear el tipo de producto');
    return created.id;
  }

  async update(id: string, input: ProductTypeInput): Promise<void> {
    await this.#db
      .update(productTypes)
      .set({
        name: input.name,
        description: input.description,
        kind: input.kind,
        template: toTemplate(input),
      })
      .where(eq(productTypes.id, id));
  }

  /** Products keep their configuration; their `typeId` becomes null (ON DELETE SET NULL). */
  async delete(id: string): Promise<void> {
    await this.#db.delete(productTypes).where(eq(productTypes.id, id));
  }
}
