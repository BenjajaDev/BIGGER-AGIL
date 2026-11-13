import type {
  MovementKind,
  Recipe,
  StockMovement,
  Supplier,
  SupplierInput,
  Supply,
  SupplyInput,
} from '@bigger/shared';
import { and, asc, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { products, recipeItems, stockMovements, suppliers, supplies } from '../../db/schema.js';

export interface MovementRecord {
  supplyId: string;
  kind: MovementKind;
  /** Signed change asked for; the repository clamps the stock at zero and stores what really changed. */
  delta: number;
  newExpiresOn: string | null;
  note: string;
}

export interface WasteRow {
  supplyName: string;
  delta: number;
  costClp: number;
  createdAt: Date;
}

export interface RecipeLine {
  supplyId: string;
  quantity: number;
}

export interface InventoryRepository {
  listSupplies: () => Promise<Supply[]>;
  findSupply: (id: string) => Promise<Supply | null>;
  createSupply: (input: SupplyInput) => Promise<string>;
  updateSupply: (id: string, input: SupplyInput) => Promise<void>;
  archiveSupply: (id: string) => Promise<void>;
  listSuppliers: () => Promise<Supplier[]>;
  createSupplier: (input: SupplierInput) => Promise<string>;
  updateSupplier: (id: string, input: SupplierInput) => Promise<void>;
  archiveSupplier: (id: string) => Promise<void>;
  applyMovement: (movement: MovementRecord) => Promise<void>;
  listMovements: (limit: number) => Promise<StockMovement[]>;
  wasteBetween: (from: Date, to: Date) => Promise<WasteRow[]>;
  listRecipes: () => Promise<Recipe[]>;
  recipeLinesFor: (
    productIds: readonly string[],
  ) => Promise<(RecipeLine & { productId: string })[]>;
  setRecipe: (productId: string, lines: readonly RecipeLine[]) => Promise<void>;
}

const supplyColumns = {
  id: supplies.id,
  name: supplies.name,
  unit: supplies.unit,
  stock: supplies.stock,
  minStock: supplies.minStock,
  costPerUnitClp: supplies.costPerUnitClp,
  supplierId: supplies.supplierId,
  supplierName: suppliers.name,
  expiresOn: supplies.expiresOn,
};

export class DrizzleInventoryRepository implements InventoryRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  listSupplies(): Promise<Supply[]> {
    return this.#db
      .select(supplyColumns)
      .from(supplies)
      .leftJoin(suppliers, eq(supplies.supplierId, suppliers.id))
      .where(isNull(supplies.archivedAt))
      .orderBy(asc(supplies.name));
  }

  async findSupply(id: string): Promise<Supply | null> {
    const [row] = await this.#db
      .select(supplyColumns)
      .from(supplies)
      .leftJoin(suppliers, eq(supplies.supplierId, suppliers.id))
      .where(and(eq(supplies.id, id), isNull(supplies.archivedAt)));
    return row ?? null;
  }

  async createSupply(input: SupplyInput): Promise<string> {
    const [row] = await this.#db.insert(supplies).values(input).returning({ id: supplies.id });
    if (!row) throw new Error('No se pudo crear el insumo');
    return row.id;
  }

  async updateSupply(id: string, input: SupplyInput): Promise<void> {
    await this.#db.update(supplies).set(input).where(eq(supplies.id, id));
  }

  async archiveSupply(id: string): Promise<void> {
    await this.#db.update(supplies).set({ archivedAt: new Date() }).where(eq(supplies.id, id));
  }

  listSuppliers(): Promise<Supplier[]> {
    return this.#db
      .select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone })
      .from(suppliers)
      .where(isNull(suppliers.archivedAt))
      .orderBy(asc(suppliers.name));
  }

  async createSupplier(input: SupplierInput): Promise<string> {
    const [row] = await this.#db.insert(suppliers).values(input).returning({ id: suppliers.id });
    if (!row) throw new Error('No se pudo crear el proveedor');
    return row.id;
  }

  async updateSupplier(id: string, input: SupplierInput): Promise<void> {
    await this.#db.update(suppliers).set(input).where(eq(suppliers.id, id));
  }

  async archiveSupplier(id: string): Promise<void> {
    await this.#db.update(suppliers).set({ archivedAt: new Date() }).where(eq(suppliers.id, id));
  }

  applyMovement(movement: MovementRecord): Promise<void> {
    // better-sqlite3 transactions are synchronous: everything inside runs with .run()/.get().
    this.#db.transaction((tx) => {
      const current = tx
        .select({ stock: supplies.stock, cost: supplies.costPerUnitClp })
        .from(supplies)
        .where(eq(supplies.id, movement.supplyId))
        .get();
      if (!current) return;
      const next = Math.max(current.stock + movement.delta, 0);
      const applied = next - current.stock;
      tx.update(supplies)
        .set({
          stock: next,
          ...(movement.newExpiresOn !== null ? { expiresOn: movement.newExpiresOn } : {}),
        })
        .where(eq(supplies.id, movement.supplyId))
        .run();
      tx.insert(stockMovements)
        .values({
          supplyId: movement.supplyId,
          kind: movement.kind,
          delta: applied,
          costClp: Math.round(Math.abs(applied) * current.cost),
          note: movement.note,
        })
        .run();
    });
    return Promise.resolve();
  }

  async listMovements(limit: number): Promise<StockMovement[]> {
    const rows = await this.#db
      .select({
        id: stockMovements.id,
        supplyId: stockMovements.supplyId,
        supplyName: supplies.name,
        kind: stockMovements.kind,
        delta: stockMovements.delta,
        costClp: stockMovements.costClp,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  wasteBetween(from: Date, to: Date): Promise<WasteRow[]> {
    return this.#db
      .select({
        supplyName: supplies.name,
        delta: stockMovements.delta,
        costClp: stockMovements.costClp,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .where(
        and(
          eq(stockMovements.kind, 'waste'),
          gte(stockMovements.createdAt, from),
          lt(stockMovements.createdAt, to),
        ),
      );
  }

  async listRecipes(): Promise<Recipe[]> {
    const rows = await this.#db
      .select({
        productId: recipeItems.productId,
        productName: products.name,
        supplyId: recipeItems.supplyId,
        quantity: recipeItems.quantity,
      })
      .from(recipeItems)
      .innerJoin(products, eq(recipeItems.productId, products.id))
      .orderBy(asc(products.name));
    const byProduct = new Map<string, Recipe>();
    for (const row of rows) {
      const recipe = byProduct.get(row.productId) ?? {
        productId: row.productId,
        productName: row.productName,
        lines: [],
      };
      recipe.lines.push({ supplyId: row.supplyId, quantity: row.quantity });
      byProduct.set(row.productId, recipe);
    }
    return [...byProduct.values()];
  }

  async recipeLinesFor(
    productIds: readonly string[],
  ): Promise<(RecipeLine & { productId: string })[]> {
    if (productIds.length === 0) return [];
    return this.#db
      .select({
        productId: recipeItems.productId,
        supplyId: recipeItems.supplyId,
        quantity: recipeItems.quantity,
      })
      .from(recipeItems)
      .where(inArray(recipeItems.productId, [...productIds]));
  }

  setRecipe(productId: string, lines: readonly RecipeLine[]): Promise<void> {
    this.#db.transaction((tx) => {
      tx.delete(recipeItems).where(eq(recipeItems.productId, productId)).run();
      if (lines.length > 0) {
        tx.insert(recipeItems)
          .values(lines.map((line) => ({ productId, ...line })))
          .run();
      }
    });
    return Promise.resolve();
  }
}
