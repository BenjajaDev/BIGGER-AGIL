import type { QuickProductInput, SingleProductInput } from '@bigger/shared';

/** A quick-loaded product: name, category and price; everything else is filled in later. */
export function quickProductInput(input: QuickProductInput): SingleProductInput {
  return {
    kind: 'single',
    categoryId: input.categoryId,
    typeId: null,
    name: input.name,
    subtitle: '',
    description: '',
    priceClp: input.priceClp,
    isAvailable: true,
    image: null,
    promotion: null,
    sizes: [],
    allergens: [],
    modifierGroupIds: [],
  };
}
