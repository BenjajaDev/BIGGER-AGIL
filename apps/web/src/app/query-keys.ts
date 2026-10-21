import type { OrderListParams } from '../services/orders.service';

/** Centralized keys so realtime invalidation and queries never drift apart. */
export const queryKeys = {
  categories: ['catalog', 'categories'] as const,
  products: ['catalog', 'products'] as const,
  menu: ['catalog', 'menu'] as const,
  tables: ['tables'] as const,
  orders: ['orders'] as const,
  orderList: (params: OrderListParams) => ['orders', params] as const,
};
