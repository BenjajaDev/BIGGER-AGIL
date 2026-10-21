import { deleteGroupWarning, describeOptions } from './modifier-group-text';

describe('modifier group texts', () => {
  it('lists options with extra price and sold-out state', () => {
    expect(
      describeOptions({
        options: [
          { id: 'a', name: 'Entera', priceDeltaClp: 0, isAvailable: true },
          { id: 'b', name: 'Vegetal', priceDeltaClp: 500, isAvailable: false },
        ],
      }),
    ).toBe('Entera · Vegetal (+$\u00a0500) (agotada)');
  });

  it('warns how many products lose the customization', () => {
    expect(deleteGroupWarning({ name: 'Extras', productCount: 3 })).toBe(
      'Se quitará de 3 productos. Esta acción no se puede deshacer.',
    );
    expect(deleteGroupWarning({ name: 'Extras', productCount: 0 })).toBe(
      'No está asignada a ningún producto. Esta acción no se puede deshacer.',
    );
  });
});
