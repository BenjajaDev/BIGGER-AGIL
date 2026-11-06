import { buildOrder } from '../../../test/builders';
import { detectNewOrders } from './new-order-detector';

describe('detectNewOrders', () => {
  const known = buildOrder();
  const fresh = buildOrder();

  it('finds only the new orders that were not seen', () => {
    expect(detectNewOrders(new Set([known.id]), [known, fresh])).toEqual([fresh]);
  });

  it('ignores orders that are already preparing, ready or delivered', () => {
    const moving = buildOrder({ status: 'preparing' });
    expect(detectNewOrders(new Set(), [moving, buildOrder({ status: 'ready' })])).toEqual([]);
  });

  it('is empty when nothing arrived', () => {
    expect(detectNewOrders(new Set([known.id, fresh.id]), [known, fresh])).toEqual([]);
  });
});
