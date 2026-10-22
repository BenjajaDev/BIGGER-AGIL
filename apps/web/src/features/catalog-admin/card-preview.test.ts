import type { AdminModifierGroup } from '@bigger/shared';
import { makeAdminProduct } from '../../test/fixtures';
import { previewCombo, previewSingleProduct } from './card-preview';

const salsas: AdminModifierGroup = {
  id: 'g-salsas',
  name: 'Salsas',
  minSelections: 0,
  maxSelections: 3,
  productCount: 1,
  options: [
    { id: 'o-mayo', name: 'Mayonesa', priceDeltaClp: 0, isAvailable: true },
    { id: 'o-bbq', name: 'BBQ', priceDeltaClp: 0, isAvailable: false },
  ],
};

describe('previewSingleProduct', () => {
  it('turns half-filled form values into a card without crashing', () => {
    const card = previewSingleProduct(
      {
        name: '  ',
        priceClp: Number.NaN,
        sizes: [{ name: '', priceClp: 4900 }],
        modifierGroupIds: ['g-salsas'],
      },
      { groups: [salsas], products: [] },
    );
    expect(card.name).toBe('Nombre del producto');
    expect(card.priceClp).toBe(0);
    expect(card.sizes).toEqual([
      { id: 'tamano-0', name: 'Tamaño 1', priceClp: 4900, groupRules: [] },
    ]);
    // The customer never sees a sold-out option.
    expect(card.modifierGroups[0]?.options.map((option) => option.name)).toEqual(['Mayonesa']);
  });

  it('shows the uploaded photo with its framing and the promotion ribbon', () => {
    const card = previewSingleProduct(
      {
        name: 'Italiana',
        image: { imageId: 'img-1', focusY: 30 },
        promotion: { startsOn: null, endsOn: null },
      },
      { groups: [], products: [] },
    );
    expect(card.image).toMatchObject({ id: 'img-1', focusY: 30 });
    expect(card.promotion).toEqual({ startsOn: null, endsOn: null });
  });
});

describe('previewCombo', () => {
  it('resolves chosen products and derives allergens from them', () => {
    const luco = makeAdminProduct({ id: 'p-luco', name: 'Luco', allergens: ['gluten', 'lacteos'] });
    const card = previewCombo(
      {
        name: 'Churrasco + pastel',
        priceClp: 5500,
        comboSlots: [
          {
            name: 'Churrasco',
            isRequired: true,
            options: [{ productId: 'p-luco', extraPriceClp: 0 }],
          },
          { name: 'Pastel', isRequired: false, options: [{ productId: '' }] },
        ],
      },
      { groups: [], products: [luco] },
    );
    expect(card.comboSlots.map((slot) => slot.name)).toEqual(['Churrasco']);
    expect(card.allergens).toEqual(['gluten', 'lacteos']);
  });
});
