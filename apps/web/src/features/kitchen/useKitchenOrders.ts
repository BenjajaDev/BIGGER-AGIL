import { KITCHEN_ORDER_STATUSES, type KitchenOrderStatus, type Order } from '@bigger/shared';
import { useOrders } from '../orders/useOrders';

const KITCHEN_QUERY = { statuses: KITCHEN_ORDER_STATUSES } as const;

export type OrdersByKitchenStatus = Readonly<Record<KitchenOrderStatus, Order[]>>;

function isKitchenStatus(status: Order['status']): status is KitchenOrderStatus {
  return (KITCHEN_ORDER_STATUSES as readonly string[]).includes(status);
}

export function groupByKitchenStatus(orders: readonly Order[]): OrdersByKitchenStatus {
  const groups: Record<KitchenOrderStatus, Order[]> = { new: [], preparing: [], ready: [] };
  for (const order of orders) {
    if (isKitchenStatus(order.status)) groups[order.status].push(order);
  }
  return groups;
}

export function useKitchenOrders() {
  return useOrders(KITCHEN_QUERY);
}
