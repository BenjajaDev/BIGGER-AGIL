import { z } from 'zod';
import { CheckSchema } from '../domain/checks.js';
import { OrderSchema } from '../domain/orders.js';

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('order.created'), payload: OrderSchema }),
  z.object({ type: z.literal('order.updated'), payload: OrderSchema }),
  /** A payment, split or new order changed a bill; closing it frees the table. */
  z.object({ type: z.literal('check.updated'), payload: CheckSchema }),
  /** The menu changed (product, combo, customization or category); clients refetch it. */
  z.object({ type: z.literal('catalog.updated') }),
]);
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
