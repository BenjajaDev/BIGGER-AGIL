import {
  OrderSchema,
  type CreateOrderInput,
  type OrderChannel,
  type OrderStatus,
  type UpdateOrderStatusInput,
} from '@bigger/shared';
import { z } from 'zod';
import { getJson, requestJson } from './http-client';

export interface OrderListParams {
  statuses?: readonly OrderStatus[];
  channel?: OrderChannel;
}

export interface UpdateOrderStatusParams {
  orderId: string;
  input: UpdateOrderStatusInput;
}

export const ordersService = {
  list: (params: OrderListParams, signal?: AbortSignal) =>
    getJson(
      '/orders',
      z.array(OrderSchema),
      { status: params.statuses?.join(','), channel: params.channel },
      signal,
    ),
  create: (input: CreateOrderInput) => requestJson('POST', '/orders', OrderSchema, { body: input }),
  updateStatus: ({ orderId, input }: UpdateOrderStatusParams) =>
    requestJson('PATCH', `/orders/${orderId}/status`, OrderSchema, { body: input }),
};
