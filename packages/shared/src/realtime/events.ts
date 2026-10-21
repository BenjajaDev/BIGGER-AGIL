import { z } from 'zod';
import { OrderSchema } from '../domain/orders.js';

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('order.created'), payload: OrderSchema }),
  z.object({ type: z.literal('order.updated'), payload: OrderSchema }),
  /** The menu changed (product, combo, customization or category); clients refetch it. */
  z.object({ type: z.literal('catalog.updated') }),
]);
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
