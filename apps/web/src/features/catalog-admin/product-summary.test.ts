import type { AdminProduct } from '@bigger/shared';
import { describeProductConfiguration } from './product-summary';

const base: AdminProduct = {
  id: 'p-1',
  categoryId: 'c-1',
  kind: 'single',
  name: 'Capuchino',
  description: '',
  priceClp: 2500,
  allergens: [],
  isAvailable: true,
  sortOrder: 0,
  archivedAt: null,
  modifierGroupIds: ['g-1', 'g-2'],
  comboSlots: [],
};

describe('describeProductConfiguration', () => {
  it('lists the customizations of a product', () => {
    expect(
      describeProductConfiguration(base, [
        { id: 'g-1', name: 'Tamaño' },
        { id: 'g-2', name: 'Tipo de leche' },
      ]),
    ).toBe('Personalizable: Tamaño, Tipo de leche');
    expect(describeProductConfiguration({ ...base, modifierGroupIds: [] }, [])).toBe(
      'Sin personalizaciones',
    );
  });

  it('summarizes what a combo lets the customer choose', () => {
    const option = (productName: string) => ({
      productId: productName,
      productName,
      extraPriceClp: 0,
      isAvailable: true,
      allergens: [],
    });
    expect(
      describeProductConfiguration(
        {
          ...base,
          kind: 'combo',
          comboSlots: [
            { id: 's-1', name: 'Café', options: [option('Americano'), option('Latte')] },
            { id: 's-2', name: 'Dulce', options: [option('Medialuna')] },
          ],
        },
        [],
      ),
    ).toBe('Café: Americano / Latte + Dulce: Medialuna');
  });
});
