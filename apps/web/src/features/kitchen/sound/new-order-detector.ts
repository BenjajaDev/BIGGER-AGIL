import type { Order } from '@bigger/shared';

/** Orders waiting in «Nuevos» that this screen has not seen before. */
export function detectNewOrders(seen: ReadonlySet<string>, orders: readonly Order[]): Order[] {
  return orders.filter((order) => order.status === 'new' && !seen.has(order.id));
}
