import { ALLERGENS, type Allergen, type ComboSlot, type MenuProduct } from '@bigger/shared';
import type { CatalogRelations } from './catalog-relations.js';
import { toProductBase, type ProductRow } from './product-row.js';

export function unionAllergens(lists: readonly (readonly Allergen[])[]): Allergen[] {
  const present = new Set(lists.flat());
  return ALLERGENS.filter((allergen) => present.has(allergen));
}

function comboAllergens(slots: readonly ComboSlot[]): Allergen[] {
  return unionAllergens(slots.flatMap((slot) => slot.options.map((option) => option.allergens)));
}

/**
 * Product plus its sizes and customizations, or its combo slots.
 * A combo's allergens come from what it can include.
 */
export function buildCatalogProduct(row: ProductRow, relations: CatalogRelations): MenuProduct {
  const product = toProductBase(row);
  if (product.kind === 'combo') {
    const comboSlots = relations.comboSlotsByProduct.get(product.id) ?? [];
    return {
      ...product,
      allergens: comboAllergens(comboSlots),
      sizes: [],
      modifierGroups: [],
      comboSlots,
    };
  }
  return {
    ...product,
    sizes: relations.sizesByProduct.get(product.id) ?? [],
    modifierGroups: relations.modifierGroupsByProduct.get(product.id) ?? [],
    comboSlots: [],
  };
}

/**
 * What a customer may see: sold-out options are hidden and empty customizations dropped.
 * A combo is not offered when a required slot has nothing left; an empty optional slot is hidden.
 * Promotion data is only kept while the promotion is running (`isActivePromotion`).
 */
export function toPublicMenuProduct(
  product: MenuProduct,
  isActivePromotion: (product: MenuProduct) => boolean,
): MenuProduct | null {
  if (!product.isAvailable) return null;
  const promotion = isActivePromotion(product) ? product.promotion : null;

  if (product.kind === 'combo') {
    const slots = product.comboSlots.map((slot) => ({
      ...slot,
      options: slot.options.filter((option) => option.isAvailable),
    }));
    if (slots.length === 0 || slots.some((slot) => slot.isRequired && slot.options.length === 0)) {
      return null;
    }
    const comboSlots = slots.filter((slot) => slot.options.length > 0);
    return { ...product, promotion, comboSlots, allergens: comboAllergens(comboSlots) };
  }

  const modifierGroups = product.modifierGroups
    .map((group) => ({ ...group, options: group.options.filter((option) => option.isAvailable) }))
    .filter((group) => group.options.length > 0);
  return { ...product, promotion, modifierGroups };
}
