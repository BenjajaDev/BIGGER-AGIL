import type { AdminCategory, AdminProduct } from '@bigger/shared';
import { comboProductDefaults, singleProductDefaults } from './form-values';

const category = (slug: string, archivedAt: string | null = null): AdminCategory => ({
  id: `id-${slug}`,
  slug,
  name: slug,
  sortOrder: 0,
  archivedAt,
  activeProductCount: 0,
});

const combo: AdminProduct = {
  id: 'p-1',
  categoryId: 'id-combos',
  kind: 'combo',
  name: 'Once BIGGER',
  description: 'Café y dulce.',
  priceClp: 5200,
  allergens: ['gluten'],
  isAvailable: true,
  sortOrder: 0,
  archivedAt: null,
  modifierGroupIds: [],
  comboSlots: [
    {
      id: 's-1',
      name: 'Café',
      options: [
        {
          productId: 'p-2',
          productName: 'Latte',
          extraPriceClp: 200,
          isAvailable: true,
          allergens: [],
        },
      ],
    },
  ],
};

describe('product form defaults', () => {
  it('suggests the "combos" category for a new combo only', () => {
    const categories = [category('cafes'), category('combos')];
    expect(comboProductDefaults(undefined, categories).categoryId).toBe('id-combos');
    expect(singleProductDefaults(undefined, categories).categoryId).toBe('');
  });

  it('ignores an archived "combos" category', () => {
    expect(
      comboProductDefaults(undefined, [category('combos', '2026-10-01T00:00:00.000Z')]).categoryId,
    ).toBe('');
  });

  it('maps an existing combo to the input the API expects, dropping read-only fields', () => {
    expect(comboProductDefaults(combo, [])).toEqual({
      kind: 'combo',
      categoryId: 'id-combos',
      name: 'Once BIGGER',
      description: 'Café y dulce.',
      priceClp: 5200,
      isAvailable: true,
      comboSlots: [{ name: 'Café', options: [{ productId: 'p-2', extraPriceClp: 200 }] }],
    });
  });
});
