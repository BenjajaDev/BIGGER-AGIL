import { describeComboSlot, describeModifierGroup } from './menu-details';

describe('describeComboSlot', () => {
  it('lists the choices with their extra price', () => {
    const option = (productName: string, extraPriceClp = 0) => ({
      productId: productName,
      productName,
      extraPriceClp,
      isAvailable: true,
      allergens: [],
    });
    expect(
      describeComboSlot({
        name: 'Café a elección',
        options: [option('Americano'), option('Capuchino'), option('Latte', 200)],
      }),
    ).toBe('Café a elección: Americano, Capuchino o Latte (+$\u00a0200)');
  });
});

describe('describeModifierGroup', () => {
  const option = (name: string, priceDeltaClp = 0) => ({
    id: name,
    name,
    priceDeltaClp,
    isAvailable: true,
  });

  it('marks mandatory and optional groups', () => {
    expect(
      describeModifierGroup({
        name: 'Tamaño',
        minSelections: 1,
        maxSelections: 1,
        options: [option('Normal'), option('Grande', 600)],
      }),
    ).toBe('Tamaño (obligatorio): Normal o Grande (+$\u00a0600)');
    expect(
      describeModifierGroup({
        name: 'Extras',
        minSelections: 0,
        maxSelections: 3,
        options: [option('Crema', 400), option('Canela')],
      }),
    ).toBe('Extras (opcional, hasta 3): Crema (+$\u00a0400) o Canela');
  });
});
