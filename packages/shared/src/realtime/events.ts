import { z } from 'zod';
import { OrderSchema } from '../domain/orders.js';

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('order.created'), payload: OrderSchema }),
  z.object({ type: z.literal('order.updated'), payload: OrderSchema }),
]);
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
