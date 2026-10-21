import type { OrderListParams } from '../services/orders.service';

/** Centralized keys so realtime invalidation and queries never drift apart. */
export const queryKeys = {
  catalog: ['catalog'] as const,
  categories: ['catalog', 'categories'] as const,
  products: ['catalog', 'products'] as const,
  menu: ['catalog', 'menu'] as const,
  tables: ['tables'] as const,
  orders: ['orders'] as const,
  orderList: (params: OrderListParams) => ['orders', params] as const,
  admin: ['admin'] as const,
  adminSession: ['admin', 'session'] as const,
  adminCategories: (includeArchived: boolean) =>
    ['admin', 'categories', { includeArchived }] as const,
  adminProducts: (includeArchived: boolean) => ['admin', 'products', { includeArchived }] as const,
  adminProduct: (id: string) => ['admin', 'products', id] as const,
  adminModifierGroups: ['admin', 'modifier-groups'] as const,
  adminModifierGroup: (id: string) => ['admin', 'modifier-groups', id] as const,
};
