import { OrderSchema, type OrderChannel, type OrderStatus } from '@bigger/shared';
import { z } from 'zod';
import { getJson } from './http-client';

export interface OrderListParams {
  statuses?: readonly OrderStatus[];
  channel?: OrderChannel;
}

export const ordersService = {
  list: (params: OrderListParams, signal?: AbortSignal) =>
    getJson(
      '/orders',
      z.array(OrderSchema),
      { status: params.statuses?.join(','), channel: params.channel },
      signal,
    ),
};
