import type { ApiFieldIssue, SizeInput } from '@bigger/shared';
import { count, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { images, modifierGroups, modifierOptions, productTypes } from '../../db/schema.js';

/** Existence checks the admin services need before saving references to other catalog rows. */
export interface CatalogLookups {
  /** Option count of every requested group that exists (missing groups are absent). */
  modifierGroupOptionCounts: (groupIds: readonly string[]) => Promise<Map<string, number>>;
  existingImageIds: (ids: readonly string[]) => Promise<string[]>;
  existingTypeIds: (ids: readonly string[]) => Promise<string[]>;
}

export class DrizzleCatalogLookups implements CatalogLookups {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async modifierGroupOptionCounts(groupIds: readonly string[]): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();
    const [groups, options] = await Promise.all([
      this.#db
        .select({ id: modifierGroups.id })
        .from(modifierGroups)
        .where(inArray(modifierGroups.id, [...groupIds])),
      this.#db
        .select({ groupId: modifierOptions.groupId, total: count() })
        .from(modifierOptions)
        .where(inArray(modifierOptions.groupId, [...groupIds]))
        .groupBy(modifierOptions.groupId),
    ]);
    const totals = new Map(options.map((row) => [row.groupId, row.total]));
    return new Map(groups.map((group) => [group.id, totals.get(group.id) ?? 0]));
  }

  async existingImageIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.#db
      .select({ id: images.id })
      .from(images)
      .where(inArray(images.id, [...ids]));
    return rows.map((row) => row.id);
  }

  async existingTypeIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.#db
      .select({ id: productTypes.id })
      .from(productTypes)
      .where(inArray(productTypes.id, [...ids]));
    return rows.map((row) => row.id);
  }
}

/** Customizations that must exist, and size rules that cannot ask for more options than exist. */
export async function customizationIssues(
  lookups: CatalogLookups,
  input: { modifierGroupIds: readonly string[]; sizes: readonly Omit<SizeInput, 'id'>[] },
): Promise<ApiFieldIssue[]> {
  const optionCounts = await lookups.modifierGroupOptionCounts(input.modifierGroupIds);
  const issues: ApiFieldIssue[] = [];
  if (input.modifierGroupIds.some((groupId) => !optionCounts.has(groupId))) {
    issues.push({ path: 'modifierGroupIds', message: 'Una personalización ya no existe' });
  }
  input.sizes.forEach((size, sizeIndex) => {
    size.groupRules.forEach((rule, ruleIndex) => {
      const available = optionCounts.get(rule.groupId);
      if (available !== undefined && rule.maxSelections > available) {
        issues.push({
          path: `sizes.${sizeIndex}.groupRules.${ruleIndex}.maxSelections`,
          message: `Esa personalización tiene solo ${available} opciones`,
        });
      }
    });
  });
  return issues;
}
