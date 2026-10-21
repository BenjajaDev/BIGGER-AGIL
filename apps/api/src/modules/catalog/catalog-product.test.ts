import type { ComboSlot, MenuProduct } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { buildCatalogProduct, toPublicMenuProduct, unionAllergens } from './catalog-product.js';

const base: MenuProduct = {
  id: 'p-1',
  categoryId: 'c-1',
  kind: 'single',
  name: 'Capuchino',
  description: '',
  priceClp: 2500,
  allergens: ['lacteos'],
  isAvailable: true,
  sortOrder: 0,
  modifierGroups: [],
  comboSlots: [],
};

const slot = (name: string, options: ComboSlot['options']): ComboSlot => ({
  id: name,
  name,
  options,
});
const option = (
  productName: string,
  allergens: ComboSlot['options'][number]['allergens'],
  isAvailable = true,
): ComboSlot['options'][number] => ({
  productId: productName,
  productName,
  extraPriceClp: 0,
  isAvailable,
  allergens,
});

describe('unionAllergens', () => {
  it('deduplicates and keeps the canonical order', () => {
    expect(
      unionAllergens([
        ['huevo', 'gluten'],
        ['lacteos', 'gluten'],
      ]),
    ).toEqual(['gluten', 'lacteos', 'huevo']);
  });
});

describe('buildCatalogProduct', () => {
  it('derives combo allergens from every product it may include', () => {
    const combo = buildCatalogProduct(
      { ...base, kind: 'combo', allergens: [] },
      {
        modifierGroupsByProduct: new Map(),
        comboSlotsByProduct: new Map([
          [
            'p-1',
            [
              slot('Café', [option('Americano', [])]),
              slot('Dulce', [option('Brownie', ['frutos-secos'])]),
            ],
          ],
        ]),
      },
    );
    expect(combo.allergens).toEqual(['frutos-secos']);
    expect(combo.modifierGroups).toEqual([]);
  });
});

describe('toPublicMenuProduct', () => {
  it('hides sold-out modifier options and drops groups left empty', () => {
    const product = toPublicMenuProduct({
      ...base,
      modifierGroups: [
        {
          id: 'g-1',
          name: 'Leche',
          minSelections: 0,
          maxSelections: 1,
          options: [
            { id: 'o-1', name: 'Entera', priceDeltaClp: 0, isAvailable: true },
            { id: 'o-2', name: 'Vegetal', priceDeltaClp: 500, isAvailable: false },
          ],
        },
        {
          id: 'g-2',
          name: 'Extras',
          minSelections: 0,
          maxSelections: 1,
          options: [{ id: 'o-3', name: 'Crema', priceDeltaClp: 400, isAvailable: false }],
        },
      ],
    });
    expect(product?.modifierGroups.map((group) => group.name)).toEqual(['Leche']);
    expect(product?.modifierGroups[0]?.options.map((o) => o.name)).toEqual(['Entera']);
  });

  it('does not offer a combo when a slot has nothing available', () => {
    const combo: MenuProduct = {
      ...base,
      kind: 'combo',
      comboSlots: [
        slot('Café', [option('Latte', ['lacteos'])]),
        slot('Dulce', [option('Brownie', [], false)]),
      ],
    };
    expect(toPublicMenuProduct(combo)).toBeNull();
  });

  it('recomputes combo allergens from the options still offered', () => {
    const combo: MenuProduct = {
      ...base,
      kind: 'combo',
      comboSlots: [
        slot('Dulce', [
          option('Medialuna', ['gluten']),
          option('Brownie', ['frutos-secos'], false),
        ]),
      ],
    };
    expect(toPublicMenuProduct(combo)?.allergens).toEqual(['gluten']);
  });

  it('hides unavailable products', () => {
    expect(toPublicMenuProduct({ ...base, isAvailable: false })).toBeNull();
  });
});
