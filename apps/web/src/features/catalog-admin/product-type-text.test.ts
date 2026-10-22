import type { ProductType, ProductTypeInput } from '@bigger/shared';
import { describeProductType, forKind } from './product-type-text';

const salad: ProductType = {
  id: '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  name: 'Ensalada armable',
  description: '',
  kind: 'single',
  sizes: [
    { name: 'Grande', priceClp: 4900, groupRules: [] },
    { name: 'Pequeña', priceClp: 2500, groupRules: [] },
  ],
  modifierGroupIds: ['g-prot', 'g-veg'],
  comboSlots: [],
  productCount: 1,
};

describe('product type helpers', () => {
  it('summarizes the sizes and customizations a new product starts with', () => {
    expect(
      describeProductType(salad, [
        { id: 'g-prot', name: 'Proteína' },
        { id: 'g-veg', name: 'Vegetales' },
      ]),
    ).toBe('Tamaños: Grande / Pequeña · Con: Proteína, Vegetales');
  });

  it('summarizes the slots of a combo type', () => {
    expect(
      describeProductType(
        {
          ...salad,
          kind: 'combo',
          comboSlots: [
            { name: 'Churrasco', isRequired: true },
            { name: 'Pastel', isRequired: false },
          ],
        },
        [],
      ),
    ).toBe('Espacios: Churrasco + Pastel (opcional)');
  });

  it('keeps only what the chosen kind uses', () => {
    const input: ProductTypeInput = {
      name: 'Mixto',
      description: '',
      kind: 'combo',
      sizes: [{ name: 'Grande', priceClp: 4900, groupRules: [] }],
      modifierGroupIds: ['g-prot'],
      comboSlots: [{ name: 'Churrasco', isRequired: true }],
    };
    expect(forKind(input)).toMatchObject({
      sizes: [],
      modifierGroupIds: [],
      comboSlots: input.comboSlots,
    });
    expect(forKind({ ...input, kind: 'single' })).toMatchObject({
      sizes: input.sizes,
      modifierGroupIds: ['g-prot'],
      comboSlots: [],
    });
  });
});
