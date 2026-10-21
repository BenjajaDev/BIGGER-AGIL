import {
  ALLERGENS,
  type Allergen,
  type ComboSlot,
  type MenuProduct,
  type Product,
} from '@bigger/shared';
import type { CatalogRelations } from './catalog-relations.js';

export function unionAllergens(lists: readonly (readonly Allergen[])[]): Allergen[] {
  const present = new Set(lists.flat());
  return ALLERGENS.filter((allergen) => present.has(allergen));
}

function comboAllergens(slots: readonly ComboSlot[]): Allergen[] {
  return unionAllergens(slots.flatMap((slot) => slot.options.map((option) => option.allergens)));
}

/** Product plus its customizations or combo slots. A combo's allergens come from what it can include. */
export function buildCatalogProduct(product: Product, relations: CatalogRelations): MenuProduct {
  if (product.kind === 'combo') {
    const comboSlots = relations.comboSlotsByProduct.get(product.id) ?? [];
    return { ...product, allergens: comboAllergens(comboSlots), modifierGroups: [], comboSlots };
  }
  return {
    ...product,
    modifierGroups: relations.modifierGroupsByProduct.get(product.id) ?? [],
    comboSlots: [],
  };
}

/**
 * What a customer may see: sold-out options are hidden, empty customizations dropped, and a
 * combo with a slot that has nothing left to choose is not offered at all.
 */
export function toPublicMenuProduct(product: MenuProduct): MenuProduct | null {
  if (!product.isAvailable) return null;

  if (product.kind === 'combo') {
    const comboSlots = product.comboSlots.map((slot) => ({
      ...slot,
      options: slot.options.filter((option) => option.isAvailable),
    }));
    if (comboSlots.length === 0 || comboSlots.some((slot) => slot.options.length === 0))
      return null;
    return { ...product, comboSlots, allergens: comboAllergens(comboSlots) };
  }

  const modifierGroups = product.modifierGroups
    .map((group) => ({ ...group, options: group.options.filter((option) => option.isAvailable) }))
    .filter((group) => group.options.length > 0);
  return { ...product, modifierGroups };
}
