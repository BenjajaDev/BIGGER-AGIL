import {
  ALLERGENS,
  type AdminModifierGroup,
  type AdminProduct,
  type ComboProductInput,
  type ImageRefInput,
  type ImageAsset,
  type SingleProductInput,
} from '@bigger/shared';
import type { DeepPartial } from 'react-hook-form';
import type { MenuCardProduct } from '../menu/components/MenuCard';

export interface PreviewSources {
  groups: readonly AdminModifierGroup[];
  products: readonly AdminProduct[];
}

/** Form values while typing: anything can be missing, numbers can be NaN. */
type Draft<T> = DeepPartial<T>;

const amount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

function previewImage(image: Draft<ImageRefInput> | null | undefined): ImageAsset | null {
  if (!image?.imageId) return null;
  return { id: image.imageId, focusY: amount(image.focusY ?? 50), width: 16, height: 9 };
}

function base(values: Draft<SingleProductInput> | Draft<ComboProductInput>) {
  return {
    name: values.name?.trim() || 'Nombre del producto',
    subtitle: values.subtitle ?? '',
    description: values.description ?? '',
    image: previewImage(values.image),
    promotion:
      values.promotion === null || values.promotion === undefined
        ? null
        : { startsOn: values.promotion.startsOn ?? null, endsOn: values.promotion.endsOn ?? null },
  };
}

/** What the customer will see for the product being edited, refreshed on every keystroke. */
export function previewSingleProduct(
  values: Draft<SingleProductInput>,
  { groups }: PreviewSources,
): MenuCardProduct {
  const groupIds = (values.modifierGroupIds ?? []).filter((id): id is string => Boolean(id));
  const sizes = (values.sizes ?? []).map((size, index) => ({
    id: size?.id ?? `tamano-${index}`,
    name: size?.name?.trim() || `Tamaño ${index + 1}`,
    priceClp: amount(size?.priceClp),
    groupRules: (size?.groupRules ?? []).flatMap((rule) =>
      rule?.groupId
        ? [
            {
              groupId: rule.groupId,
              minSelections: amount(rule.minSelections),
              maxSelections: amount(rule.maxSelections),
            },
          ]
        : [],
    ),
  }));
  return {
    ...base(values),
    priceClp: amount(values.priceClp),
    allergens: (values.allergens ?? []).filter((allergen) => allergen !== undefined),
    sizes,
    modifierGroups: groupIds.flatMap((id) => {
      const group = groups.find((candidate) => candidate.id === id);
      return group
        ? [{ ...group, options: group.options.filter((option) => option.isAvailable) }]
        : [];
    }),
    comboSlots: [],
  };
}

export function previewCombo(
  values: Draft<ComboProductInput>,
  { products }: PreviewSources,
): MenuCardProduct {
  const comboSlots = (values.comboSlots ?? []).flatMap((slot, index) => {
    const options = (slot?.options ?? []).flatMap((option) => {
      const product = products.find((candidate) => candidate.id === option?.productId);
      return product
        ? [
            {
              productId: product.id,
              productName: product.name,
              extraPriceClp: amount(option?.extraPriceClp),
              isAvailable: product.isAvailable,
              allergens: product.allergens,
            },
          ]
        : [];
    });
    if (options.length === 0) return [];
    return [
      {
        id: `espacio-${index}`,
        name: slot?.name?.trim() || `Espacio ${index + 1}`,
        isRequired: slot?.isRequired ?? true,
        options,
      },
    ];
  });
  const present = new Set(comboSlots.flatMap((slot) => slot.options.flatMap((o) => o.allergens)));
  return {
    ...base(values),
    priceClp: amount(values.priceClp),
    allergens: ALLERGENS.filter((allergen) => present.has(allergen)),
    sizes: [],
    modifierGroups: [],
    comboSlots,
  };
}
