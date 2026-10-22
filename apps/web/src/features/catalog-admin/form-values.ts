import type {
  AdminCategory,
  AdminModifierGroup,
  AdminProduct,
  ComboProductInput,
  ImageAsset,
  ImageRefInput,
  ModifierGroupInput,
  ProductSize,
  ProductType,
  ProductTypeInput,
  SingleProductInput,
  SizeInput,
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

export const PRODUCT_TYPES_PATH = '/configuracion/tipos';

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

export function toImageRef(image: ImageAsset | null): ImageRefInput | null {
  return image ? { imageId: image.id, focusY: image.focusY } : null;
}

function toSizeInputs(sizes: readonly (Omit<ProductSize, 'id'> & { id?: string })[]): SizeInput[] {
  return sizes.map((size) => ({
    ...(size.id ? { id: size.id } : {}),
    name: size.name,
    priceClp: size.priceClp,
    groupRules: size.groupRules.map((rule) => ({ ...rule })),
  }));
}

/** New product pre-filled from a type (template): sizes, customizations and per-size rules. */
export function singleProductDefaults(
  product: AdminProduct | undefined,
  categories: readonly AdminCategory[],
  template: ProductType | null = null,
): DefaultValues<SingleProductInput> {
  if (!product) {
    return {
      kind: 'single',
      typeId: template?.id ?? null,
      categoryId: suggestedCategoryId(categories, 'single'),
      name: '',
      subtitle: '',
      description: '',
      priceClp: null,
      isAvailable: true,
      image: null,
      promotion: null,
      allergens: [],
      modifierGroupIds: template ? [...template.modifierGroupIds] : [],
      sizes: template ? toSizeInputs(template.sizes) : [],
    };
  }
  return {
    kind: 'single',
    typeId: product.typeId,
    categoryId: product.categoryId,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    priceClp: product.sizes.length > 0 ? null : product.priceClp,
    isAvailable: product.isAvailable,
    image: toImageRef(product.image),
    promotion: product.promotion,
    allergens: product.allergens,
    modifierGroupIds: product.modifierGroupIds,
    sizes: toSizeInputs(product.sizes),
  };
}

export const EMPTY_COMBO_OPTION = { productId: '', extraPriceClp: 0 };
export const EMPTY_COMBO_SLOT = { name: '', isRequired: true, options: [EMPTY_COMBO_OPTION] };

export function comboProductDefaults(
  product: AdminProduct | undefined,
  categories: readonly AdminCategory[],
  template: ProductType | null = null,
): DefaultValues<ComboProductInput> {
  if (!product) {
    return {
      kind: 'combo',
      typeId: template?.id ?? null,
      categoryId: suggestedCategoryId(categories, 'combo'),
      name: '',
      subtitle: '',
      description: '',
      isAvailable: true,
      image: null,
      promotion: null,
      comboSlots:
        template && template.comboSlots.length > 0
          ? template.comboSlots.map((slot) => ({ ...slot, options: [EMPTY_COMBO_OPTION] }))
          : [EMPTY_COMBO_SLOT],
    };
  }
  return {
    kind: 'combo',
    typeId: product.typeId,
    categoryId: product.categoryId,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    priceClp: product.priceClp,
    isAvailable: product.isAvailable,
    image: toImageRef(product.image),
    promotion: product.promotion,
    comboSlots: product.comboSlots.map((slot) => ({
      name: slot.name,
      isRequired: slot.isRequired,
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

export function productTypeDefaults(
  type: ProductType | undefined,
): DefaultValues<ProductTypeInput> {
  if (!type) {
    return {
      name: '',
      description: '',
      kind: 'single',
      sizes: [],
      modifierGroupIds: [],
      comboSlots: [],
    };
  }
  return {
    name: type.name,
    description: type.description,
    kind: type.kind,
    sizes: toSizeInputs(type.sizes),
    modifierGroupIds: type.modifierGroupIds,
    comboSlots: type.comboSlots,
  };
}
