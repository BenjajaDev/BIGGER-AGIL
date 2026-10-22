import { makeAdminProduct } from '../../test/fixtures';
import { describeProductConfiguration } from './product-summary';

const base = makeAdminProduct({ modifierGroupIds: ['g-1', 'g-2'] });

describe('describeProductConfiguration', () => {
  it('lists the customizations of a product', () => {
    expect(
      describeProductConfiguration(base, [
        { id: 'g-1', name: 'Salsas' },
        { id: 'g-2', name: 'Vegetales' },
      ]),
    ).toBe('Personalizable: Salsas, Vegetales');
    expect(describeProductConfiguration({ ...base, modifierGroupIds: [] }, [])).toBe(
      'Sin personalizaciones',
    );
  });

  it('names the sizes before the customizations', () => {
    const size = (name: string) => ({ id: name, name, priceClp: 2500, groupRules: [] });
    expect(
      describeProductConfiguration(
        { ...base, modifierGroupIds: ['g-1'], sizes: [size('Grande'), size('Pequeña')] },
        [{ id: 'g-1', name: 'Vegetales' }],
      ),
    ).toBe('Tamaños: Grande / Pequeña · Personalizable: Vegetales');
  });

  it('summarizes what a combo lets the customer choose and marks optional slots', () => {
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
            {
              id: 's-1',
              name: 'Churrasco',
              isRequired: true,
              options: [option('Luco'), option('Italiano')],
            },
            { id: 's-2', name: 'Pastel', isRequired: false, options: [option('Pie de limón')] },
          ],
        },
        [],
      ),
    ).toBe('Churrasco: Luco / Italiano + Pastel (opcional): Pie de limón');
  });
});
