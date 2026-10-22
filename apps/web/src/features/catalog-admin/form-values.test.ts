import type { ProductType } from '@bigger/shared';
import { makeAdminCategory, makeAdminProduct } from '../../test/fixtures';
import { comboProductDefaults, singleProductDefaults } from './form-values';

const categories = [
  makeAdminCategory({ id: 'id-cafes', slug: 'cafes' }),
  makeAdminCategory({ id: 'id-combos', slug: 'combos' }),
];

const ensaladaType: ProductType = {
  id: 'type-1',
  name: 'Ensalada armable',
  description: '',
  kind: 'single',
  sizes: [
    {
      name: 'Grande',
      priceClp: 4900,
      groupRules: [{ groupId: 'g-prot', minSelections: 1, maxSelections: 1 }],
    },
  ],
  modifierGroupIds: ['g-prot'],
  comboSlots: [],
  productCount: 1,
};

describe('product form defaults', () => {
  it('suggests the "combos" category for a new combo only', () => {
    expect(comboProductDefaults(undefined, categories).categoryId).toBe('id-combos');
    expect(singleProductDefaults(undefined, categories).categoryId).toBe('');
  });

  it('ignores an archived "combos" category', () => {
    expect(
      comboProductDefaults(undefined, [
        makeAdminCategory({ slug: 'combos', archivedAt: '2026-10-01T00:00:00.000Z' }),
      ]).categoryId,
    ).toBe('');
  });

  it('pre-fills a new product from its type: sizes, rules and customizations', () => {
    const defaults = singleProductDefaults(undefined, categories, ensaladaType);
    expect(defaults).toMatchObject({
      typeId: 'type-1',
      priceClp: null,
      modifierGroupIds: ['g-prot'],
      sizes: [
        {
          name: 'Grande',
          priceClp: 4900,
          groupRules: [{ groupId: 'g-prot', minSelections: 1, maxSelections: 1 }],
        },
      ],
    });
  });

  it('pre-fills combo slot names and whether they are required from a combo type', () => {
    const defaults = comboProductDefaults(undefined, categories, {
      ...ensaladaType,
      kind: 'combo',
      sizes: [],
      modifierGroupIds: [],
      comboSlots: [
        { name: 'Churrasco', isRequired: true },
        { name: 'Pastel', isRequired: false },
      ],
    });
    expect(defaults.comboSlots).toEqual([
      { name: 'Churrasco', isRequired: true, options: [{ productId: '', extraPriceClp: 0 }] },
      { name: 'Pastel', isRequired: false, options: [{ productId: '', extraPriceClp: 0 }] },
    ]);
  });

  it('maps an existing sized product, keeping size ids and leaving the base price empty', () => {
    const product = makeAdminProduct({
      priceClp: 2500,
      image: { id: 'img', width: 1200, height: 675, focusY: 40 },
      sizes: [{ id: 's-1', name: 'Pequeña', priceClp: 2500, groupRules: [] }],
    });
    expect(singleProductDefaults(product, categories)).toMatchObject({
      priceClp: null,
      image: { imageId: 'img', focusY: 40 },
      sizes: [{ id: 's-1', name: 'Pequeña', priceClp: 2500, groupRules: [] }],
    });
  });

  it('maps an existing combo to the input the API expects, dropping read-only fields', () => {
    const combo = makeAdminProduct({
      kind: 'combo',
      categoryId: 'id-combos',
      name: 'Churrasco + pastel',
      priceClp: 5500,
      comboSlots: [
        {
          id: 's-1',
          name: 'Pastel',
          isRequired: false,
          options: [
            {
              productId: 'p-2',
              productName: 'Pie limón',
              extraPriceClp: 200,
              isAvailable: true,
              allergens: [],
            },
          ],
        },
      ],
    });
    expect(comboProductDefaults(combo, []).comboSlots).toEqual([
      { name: 'Pastel', isRequired: false, options: [{ productId: 'p-2', extraPriceClp: 200 }] },
    ]);
  });
});
