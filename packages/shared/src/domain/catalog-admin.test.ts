import { describe, expect, it } from 'vitest';
import { ModifierGroupInputSchema, ProductInputSchema } from './catalog-admin.js';

const categoryId = '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const capuchinoId = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const latteId = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e';

const option = (name: string, priceDeltaClp = 0) => ({ name, priceDeltaClp, isAvailable: true });

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('ModifierGroupInputSchema', () => {
  it('accepts an optional single-choice group', () => {
    const result = ModifierGroupInputSchema.safeParse({
      name: 'Tipo de leche',
      minSelections: 0,
      maxSelections: 1,
      options: [option('Entera'), option('Vegetal', 500)],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a minimum above the maximum', () => {
    const result = ModifierGroupInputSchema.safeParse({
      name: 'Tamaño',
      minSelections: 2,
      maxSelections: 1,
      options: [option('Normal'), option('Grande')],
    });
    expect(issuePaths(result)).toContain('minSelections');
  });

  it('rejects allowing more choices than options exist', () => {
    const result = ModifierGroupInputSchema.safeParse({
      name: 'Extras',
      minSelections: 0,
      maxSelections: 3,
      options: [option('Crema')],
    });
    expect(issuePaths(result)).toContain('maxSelections');
  });

  it('rejects duplicated option names regardless of case', () => {
    const result = ModifierGroupInputSchema.safeParse({
      name: 'Leche',
      minSelections: 0,
      maxSelections: 1,
      options: [option('Vegetal'), option(' vegetal ')],
    });
    expect(issuePaths(result)).toContain('options');
  });
});

describe('ProductInputSchema', () => {
  const base = {
    categoryId,
    name: 'Once BIGGER',
    description: '',
    priceClp: 5200,
    isAvailable: true,
  };

  it('accepts a combo with choice slots', () => {
    const result = ProductInputSchema.safeParse({
      ...base,
      kind: 'combo',
      comboSlots: [
        {
          name: 'Café a elección',
          options: [
            { productId: capuchinoId, extraPriceClp: 0 },
            { productId: latteId, extraPriceClp: 200 },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a combo without slots and a slot without options', () => {
    expect(
      issuePaths(ProductInputSchema.safeParse({ ...base, kind: 'combo', comboSlots: [] })),
    ).toContain('comboSlots');
    expect(
      issuePaths(
        ProductInputSchema.safeParse({
          ...base,
          kind: 'combo',
          comboSlots: [{ name: 'Dulce', options: [] }],
        }),
      ),
    ).toContain('comboSlots.0.options');
  });

  it('rejects the same product twice in a slot', () => {
    const result = ProductInputSchema.safeParse({
      ...base,
      kind: 'combo',
      comboSlots: [
        {
          name: 'Café',
          options: [
            { productId: capuchinoId, extraPriceClp: 0 },
            { productId: capuchinoId, extraPriceClp: 100 },
          ],
        },
      ],
    });
    expect(issuePaths(result)).toContain('comboSlots.0.options');
  });

  it('rejects decimal prices and blank names', () => {
    const result = ProductInputSchema.safeParse({
      ...base,
      kind: 'single',
      name: '   ',
      priceClp: 2500.5,
      allergens: [],
      modifierGroupIds: [],
    });
    expect(issuePaths(result)).toEqual(expect.arrayContaining(['name', 'priceClp']));
  });
});
