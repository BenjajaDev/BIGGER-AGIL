import { kitchenDropStatus, matchesKitchenDrag } from './kitchen-drag';
import { orderFixture } from '../../test/orders';

describe('kitchen drag rules', () => {
  it.each([
    ['new', 'preparing', 'preparing'],
    ['preparing', 'ready', 'ready'],
    ['new', 'new', null],
    ['new', 'ready', null],
    ['preparing', 'new', null],
    ['preparing', 'preparing', null],
    ['ready', 'new', null],
    ['ready', 'preparing', null],
    ['ready', 'ready', null],
    ['ready', 'delivered', null],
    ['new', undefined, null],
  ] as const)('%s → %s resolves to %s', (from, destination, expected) => {
    expect(kitchenDropStatus(from, destination)).toBe(expected);
  });

  it('rejects a missing order or a changed state, version or identifier', () => {
    expect(matchesKitchenDrag(orderFixture, orderFixture)).toBe(true);
    for (const changed of [
      undefined,
      { ...orderFixture, status: 'preparing' as const },
      { ...orderFixture, updatedAt: '2026-10-22T12:00:00.000Z' },
      { ...orderFixture, id: 'another-order' },
    ])
      expect(matchesKitchenDrag(changed, orderFixture)).toBe(false);
  });
});
