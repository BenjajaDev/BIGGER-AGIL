import type { ComboSlot, MenuProduct } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { buildCatalogProduct, toPublicMenuProduct, unionAllergens } from './catalog-product.js';
import type { ProductRow } from './product-row.js';

const row: ProductRow = {
  id: 'p-1',
  categoryId: 'c-1',
  typeId: null,
  kind: 'single',
  name: 'Capuchino',
  subtitle: '',
  description: '',
  priceClp: 2500,
  allergens: ['lacteos'],
  isAvailable: true,
  sortOrder: 0,
  imageId: null,
  imageFocusY: 50,
  imageWidth: null,
  imageHeight: null,
  isPromotion: false,
  promoStartsOn: null,
  promoEndsOn: null,
};

const base: MenuProduct = {
  id: 'p-1',
  categoryId: 'c-1',
  typeId: null,
  kind: 'single',
  name: 'Capuchino',
  subtitle: '',
  description: '',
  priceClp: 2500,
  allergens: ['lacteos'],
  isAvailable: true,
  sortOrder: 0,
  image: null,
  sizes: [],
  promotion: null,
  modifierGroups: [],
  comboSlots: [],
};

const noRelations = {
  modifierGroupsByProduct: new Map(),
  comboSlotsByProduct: new Map(),
  sizesByProduct: new Map(),
};

const slot = (name: string, options: ComboSlot['options'], isRequired = true): ComboSlot => ({
  id: name,
  name,
  isRequired,
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

const always = () => true;
const never = () => false;

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
  it('maps image and promotion columns', () => {
    const product = buildCatalogProduct(
      {
        ...row,
        imageId: 'img-1',
        imageWidth: 1200,
        imageHeight: 800,
        imageFocusY: 30,
        isPromotion: true,
        promoEndsOn: '2026-12-31',
      },
      noRelations,
    );
    expect(product.image).toEqual({ id: 'img-1', width: 1200, height: 800, focusY: 30 });
    expect(product.promotion).toEqual({ startsOn: null, endsOn: '2026-12-31' });
  });

  it('attaches sizes to single products', () => {
    const sizes = [{ id: 's-1', name: 'Grande', priceClp: 6900, groupRules: [] }];
    const product = buildCatalogProduct(row, {
      ...noRelations,
      sizesByProduct: new Map([['p-1', sizes]]),
    });
    expect(product.sizes).toEqual(sizes);
  });

  it('derives combo allergens from every product it may include', () => {
    const combo = buildCatalogProduct(
      { ...row, kind: 'combo', allergens: [] },
      {
        ...noRelations,
        comboSlotsByProduct: new Map([
          [
            'p-1',
            [
              slot('Café', [option('Americano', [])]),
              slot('Dulce', [option('Brownie', ['frutos-secos'])], false),
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
    const product = toPublicMenuProduct(
      {
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
      },
      never,
    );
    expect(product?.modifierGroups.map((group) => group.name)).toEqual(['Leche']);
    expect(product?.modifierGroups[0]?.options.map((o) => o.name)).toEqual(['Entera']);
  });

  it('does not offer a combo when a required slot has nothing available', () => {
    const combo: MenuProduct = {
      ...base,
      kind: 'combo',
      comboSlots: [
        slot('Café', [option('Latte', ['lacteos'])]),
        slot('Dulce', [option('Brownie', [], false)]),
      ],
    };
    expect(toPublicMenuProduct(combo, never)).toBeNull();
  });

  it('keeps the combo but hides an optional slot left without options', () => {
    const combo = toPublicMenuProduct(
      {
        ...base,
        kind: 'combo',
        comboSlots: [
          slot('Café', [option('Latte', ['lacteos'])]),
          slot('Donut', [option('Donut glaseada', ['gluten'], false)], false),
        ],
      },
      never,
    );
    expect(combo?.comboSlots.map((s) => s.name)).toEqual(['Café']);
    expect(combo?.allergens).toEqual(['lacteos']);
  });

  it('keeps the promotion only while it is running', () => {
    const promo = { ...base, promotion: { startsOn: null, endsOn: '2026-10-31' } };
    expect(toPublicMenuProduct(promo, always)?.promotion).toEqual(promo.promotion);
    expect(toPublicMenuProduct(promo, never)?.promotion).toBeNull();
  });

  it('hides unavailable products', () => {
    expect(toPublicMenuProduct({ ...base, isAvailable: false }, always)).toBeNull();
  });
});
