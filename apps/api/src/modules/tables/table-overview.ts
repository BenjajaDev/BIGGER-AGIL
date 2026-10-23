import {
  OPEN_ORDER_STATUSES,
  type Check,
  type DiningTable,
  type Order,
  type TableOverview,
  type TableStatus,
} from '@bigger/shared';

type OpenOrder = Pick<Order, 'status' | 'items' | 'totalClp' | 'createdAt'>;

/** What the map needs from a table's open check. */
export type TableCheck = Pick<Check, 'id' | 'paidClp' | 'balanceClp'> & {
  orders: readonly OpenOrder[];
};

const isOpen = (order: OpenOrder) =>
  (OPEN_ORDER_STATUSES as readonly Order['status'][]).includes(order.status);

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

export function buildTableOverview(table: DiningTable, check: TableCheck | null): TableOverview {
  const openOrders = check?.orders.filter(isOpen) ?? [];
  const openSince = openOrders.reduce<string | null>(
    (oldest, order) => (oldest === null || order.createdAt < oldest ? order.createdAt : oldest),
    null,
  );

  return {
    ...table,
    status: deriveTableStatus(openOrders),
    checkId: check?.id ?? null,
    itemCount: openOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ),
    openTotalClp: openOrders.reduce((sum, order) => sum + order.totalClp, 0),
    paidClp: check?.paidClp ?? 0,
    balanceClp: check?.balanceClp ?? 0,
    openSince,
  };
}
