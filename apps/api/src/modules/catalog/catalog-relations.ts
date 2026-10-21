import type { ComboSlot, ModifierGroup } from '@bigger/shared';
import { asc, eq, inArray, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import {
  comboSlotOptions,
  comboSlots,
  modifierGroups,
  modifierOptions,
  productModifierGroups,
  products,
} from '../../db/schema.js';

export interface CatalogRelations {
  modifierGroupsByProduct: ReadonlyMap<string, ModifierGroup[]>;
  comboSlotsByProduct: ReadonlyMap<string, ComboSlot[]>;
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

/** Loads modifier groups with their options, in display order. `undefined` loads every group. */
export async function loadModifierGroups(
  db: AppDatabase,
  groupIds?: readonly string[],
): Promise<ModifierGroup[]> {
  if (groupIds?.length === 0) return [];

  const groups = await db
    .select({
      id: modifierGroups.id,
      name: modifierGroups.name,
      minSelections: modifierGroups.minSelections,
      maxSelections: modifierGroups.maxSelections,
    })
    .from(modifierGroups)
    .where(groupIds ? inArray(modifierGroups.id, [...groupIds]) : undefined)
    .orderBy(asc(modifierGroups.name));

  if (groups.length === 0) return [];

  const options = await db
    .select({
      groupId: modifierOptions.groupId,
      id: modifierOptions.id,
      name: modifierOptions.name,
      priceDeltaClp: modifierOptions.priceDeltaClp,
      isAvailable: modifierOptions.isAvailable,
    })
    .from(modifierOptions)
    .where(
      inArray(
        modifierOptions.groupId,
        groups.map((group) => group.id),
      ),
    )
    .orderBy(asc(modifierOptions.position));

  const optionsByGroup = new Map<string, ModifierGroup['options']>();
  for (const { groupId, ...option } of options) pushTo(optionsByGroup, groupId, option);

  return groups.map((group) => ({ ...group, options: optionsByGroup.get(group.id) ?? [] }));
}

async function loadModifierGroupsByProduct(
  db: AppDatabase,
  productIds: readonly string[],
): Promise<Map<string, ModifierGroup[]>> {
  const links = await db
    .select({ productId: productModifierGroups.productId, groupId: productModifierGroups.groupId })
    .from(productModifierGroups)
    .where(inArray(productModifierGroups.productId, [...productIds]))
    .orderBy(asc(productModifierGroups.position));

  const groups = await loadModifierGroups(db, [...new Set(links.map((link) => link.groupId))]);
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  const result = new Map<string, ModifierGroup[]>();
  for (const link of links) {
    const group = groupsById.get(link.groupId);
    if (group) pushTo(result, link.productId, group);
  }
  return result;
}

async function loadComboSlotsByProduct(
  db: AppDatabase,
  comboIds: readonly string[],
): Promise<Map<string, ComboSlot[]>> {
  const slots = await db
    .select({ id: comboSlots.id, comboId: comboSlots.comboId, name: comboSlots.name })
    .from(comboSlots)
    .where(inArray(comboSlots.comboId, [...comboIds]))
    .orderBy(asc(comboSlots.position));

  if (slots.length === 0) return new Map();

  const options = await db
    .select({
      slotId: comboSlotOptions.slotId,
      productId: comboSlotOptions.productId,
      productName: products.name,
      extraPriceClp: comboSlotOptions.extraPriceClp,
      productAvailable: products.isAvailable,
      productArchivedAt: products.archivedAt,
      allergens: products.allergens,
    })
    .from(comboSlotOptions)
    .innerJoin(products, eq(comboSlotOptions.productId, products.id))
    .where(
      inArray(
        comboSlotOptions.slotId,
        slots.map((slot) => slot.id),
      ),
    )
    .orderBy(asc(comboSlotOptions.position));

  const optionsBySlot = new Map<string, ComboSlot['options']>();
  for (const { slotId, productAvailable, productArchivedAt, ...option } of options) {
    pushTo(optionsBySlot, slotId, {
      ...option,
      isAvailable: productAvailable && productArchivedAt === null,
    });
  }

  const result = new Map<string, ComboSlot[]>();
  for (const { comboId, ...slot } of slots) {
    pushTo(result, comboId, { ...slot, options: optionsBySlot.get(slot.id) ?? [] });
  }
  return result;
}

export async function loadCatalogRelations(
  db: AppDatabase,
  productRows: readonly { id: string; kind: 'single' | 'combo' }[],
): Promise<CatalogRelations> {
  const singleIds = productRows.filter((row) => row.kind === 'single').map((row) => row.id);
  const comboIds = productRows.filter((row) => row.kind === 'combo').map((row) => row.id);

  const [modifierGroupsByProduct, comboSlotsByProduct] = await Promise.all([
    singleIds.length
      ? loadModifierGroupsByProduct(db, singleIds)
      : new Map<string, ModifierGroup[]>(),
    comboIds.length ? loadComboSlotsByProduct(db, comboIds) : new Map<string, ComboSlot[]>(),
  ]);
  return { modifierGroupsByProduct, comboSlotsByProduct };
}

/** Columns every product read model shares. */
export const productColumns = {
  id: products.id,
  categoryId: products.categoryId,
  kind: products.kind,
  name: products.name,
  description: products.description,
  priceClp: products.priceClp,
  allergens: products.allergens,
  isAvailable: products.isAvailable,
  sortOrder: products.sortOrder,
};

export const activeProduct = () => isNull(products.archivedAt);
