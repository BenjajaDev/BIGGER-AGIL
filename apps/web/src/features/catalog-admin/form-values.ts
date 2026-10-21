import type {
  AdminCategory,
  AdminModifierGroup,
  AdminProduct,
  ComboProductInput,
  ModifierGroupInput,
  SingleProductInput,
} from '@bigger/shared';
import type { DefaultValues } from 'react-hook-form';

export type ProductKindCopy = (typeof PRODUCT_KIND_COPY)[keyof typeof PRODUCT_KIND_COPY];

export const PRODUCT_KIND_COPY = {
  single: {
    kind: 'single',
    title: 'Productos',
    singular: 'producto',
    newLabel: 'Nuevo producto',
    basePath: '/configuracion/productos',
  },
  combo: {
    kind: 'combo',
    title: 'Combos',
    singular: 'combo',
    newLabel: 'Nuevo combo',
    basePath: '/configuracion/combos',
  },
} as const;

const COMBO_CATEGORY_SLUG = 'combos';

function suggestedCategoryId(
  categories: readonly AdminCategory[],
  kind: 'single' | 'combo',
): string {
  const active = categories.filter((category) => category.archivedAt === null);
  const preferred =
    kind === 'combo' ? active.find((category) => category.slug === COMBO_CATEGORY_SLUG) : undefined;
  return preferred?.id ?? '';
}

export function singleProductDefaults(
  product: AdminProduct | undefined,
  categories: readonly AdminCategory[],
): DefaultValues<SingleProductInput> {
  if (!product) {
    return {
      kind: 'single',
      categoryId: suggestedCategoryId(categories, 'single'),
      name: '',
      description: '',
      isAvailable: true,
      allergens: [],
      modifierGroupIds: [],
    };
  }
  return {
    kind: 'single',
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    priceClp: product.priceClp,
    isAvailable: product.isAvailable,
    allergens: product.allergens,
    modifierGroupIds: product.modifierGroupIds,
  };
}

export const EMPTY_COMBO_SLOT = { name: '', options: [{ productId: '', extraPriceClp: 0 }] };

export function comboProductDefaults(
  product: AdminProduct | undefined,
  categories: readonly AdminCategory[],
): DefaultValues<ComboProductInput> {
  if (!product) {
    return {
      kind: 'combo',
      categoryId: suggestedCategoryId(categories, 'combo'),
      name: '',
      description: '',
      isAvailable: true,
      comboSlots: [EMPTY_COMBO_SLOT],
    };
  }
  return {
    kind: 'combo',
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    priceClp: product.priceClp,
    isAvailable: product.isAvailable,
    comboSlots: product.comboSlots.map((slot) => ({
      name: slot.name,
      options: slot.options.map((option) => ({
        productId: option.productId,
        extraPriceClp: option.extraPriceClp,
      })),
    })),
  };
}

export const EMPTY_MODIFIER_OPTION = { name: '', priceDeltaClp: 0, isAvailable: true };

export function modifierGroupDefaults(
  group: AdminModifierGroup | undefined,
): DefaultValues<ModifierGroupInput> {
  if (!group) {
    return { name: '', minSelections: 0, maxSelections: 1, options: [EMPTY_MODIFIER_OPTION] };
  }
  return {
    name: group.name,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    options: group.options.map(({ id, name, priceDeltaClp, isAvailable }) => ({
      id,
      name,
      priceDeltaClp,
      isAvailable,
    })),
  };
}
