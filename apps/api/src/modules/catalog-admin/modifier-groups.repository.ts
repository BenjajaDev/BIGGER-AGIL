import type { AdminModifierGroup, ModifierGroupInput } from '@bigger/shared';
import { and, count, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../../db/client.js';
import {
  modifierGroups,
  modifierOptions,
  productModifierGroups,
  products,
} from '../../db/schema.js';
import { loadModifierGroups } from '../catalog/catalog-relations.js';
import type { Transaction } from './transaction.js';

export interface ModifierGroupsAdminRepository {
  list: () => Promise<AdminModifierGroup[]>;
  findById: (id: string) => Promise<AdminModifierGroup | null>;
  create: (input: ModifierGroupInput) => Promise<string>;
  update: (id: string, input: ModifierGroupInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

/** Keeps the id of options that already belonged to this group; anything else gets a new id. */
function writeOptions(
  tx: Transaction,
  groupId: string,
  options: ModifierGroupInput['options'],
  reusableIds: ReadonlySet<string>,
): void {
  tx.delete(modifierOptions).where(eq(modifierOptions.groupId, groupId)).run();
  tx.insert(modifierOptions)
    .values(
      options.map((option, position) => ({
        id: option.id && reusableIds.has(option.id) ? option.id : randomUUID(),
        groupId,
        name: option.name,
        priceDeltaClp: option.priceDeltaClp,
        isAvailable: option.isAvailable,
        position,
      })),
    )
    .run();
}

export class DrizzleModifierGroupsAdminRepository implements ModifierGroupsAdminRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async list(): Promise<AdminModifierGroup[]> {
    const [groups, usage] = await Promise.all([
      loadModifierGroups(this.#db),
      this.#db
        .select({ groupId: productModifierGroups.groupId, total: count() })
        .from(productModifierGroups)
        .innerJoin(
          products,
          and(eq(productModifierGroups.productId, products.id), isNull(products.archivedAt)),
        )
        .groupBy(productModifierGroups.groupId),
    ]);
    const usageByGroup = new Map(usage.map((row) => [row.groupId, row.total]));
    return groups.map((group) => ({ ...group, productCount: usageByGroup.get(group.id) ?? 0 }));
  }

  async findById(id: string): Promise<AdminModifierGroup | null> {
    const all = await this.list();
    return all.find((group) => group.id === id) ?? null;
  }

  create(input: ModifierGroupInput): Promise<string> {
    const id = randomUUID();
    this.#db.transaction((tx) => {
      tx.insert(modifierGroups)
        .values({
          id,
          name: input.name,
          minSelections: input.minSelections,
          maxSelections: input.maxSelections,
        })
        .run();
      writeOptions(tx, id, input.options, new Set());
    });
    return Promise.resolve(id);
  }

  async update(id: string, input: ModifierGroupInput): Promise<void> {
    const current = await this.#db
      .select({ id: modifierOptions.id })
      .from(modifierOptions)
      .where(eq(modifierOptions.groupId, id));
    const reusableIds = new Set(current.map((option) => option.id));

    this.#db.transaction((tx) => {
      tx.update(modifierGroups)
        .set({
          name: input.name,
          minSelections: input.minSelections,
          maxSelections: input.maxSelections,
        })
        .where(eq(modifierGroups.id, id))
        .run();
      writeOptions(tx, id, input.options, reusableIds);
    });
  }

  async delete(id: string): Promise<void> {
    await this.#db.delete(modifierGroups).where(eq(modifierGroups.id, id));
  }
}
