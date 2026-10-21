import type { DiningTable, Order, TableOverview, TableStatus } from '@bigger/shared';

type OpenOrder = Pick<Order, 'status' | 'items' | 'totalClp' | 'createdAt'>;

/**
 * Table status is derived from its open orders instead of being stored,
 * so it can never drift from the comandas (single source of truth).
 */
export function deriveTableStatus(openOrders: readonly OpenOrder[]): TableStatus {
  if (openOrders.length === 0) return 'free';
  return openOrders.every((order) => order.status === 'delivered')
    ? 'awaiting-payment'
    : 'occupied';
}

export function buildTableOverview(
  table: DiningTable,
  openOrders: readonly OpenOrder[],
): TableOverview {
  const openSince = openOrders.reduce<string | null>(
    (oldest, order) => (oldest === null || order.createdAt < oldest ? order.createdAt : oldest),
    null,
  );

  return {
    ...table,
    status: deriveTableStatus(openOrders),
    itemCount: openOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ),
    openTotalClp: openOrders.reduce((sum, order) => sum + order.totalClp, 0),
    openSince,
  };
}
