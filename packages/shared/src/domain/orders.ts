import { z } from 'zod';
import { PriceClpSchema } from './catalog.js';

export const ORDER_STATUSES = [
  'new',
  'preparing',
  'ready',
  'delivered',
  'paid',
  'cancelled',
] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Statuses that keep a table occupied: the order is not settled yet. */
export const OPEN_ORDER_STATUSES = [
  'new',
  'preparing',
  'ready',
  'delivered',
] as const satisfies readonly OrderStatus[];

/** Statuses the kitchen board displays, in column order. */
export const KITCHEN_ORDER_STATUSES = [
  'new',
  'preparing',
  'ready',
] as const satisfies readonly OrderStatus[];
export type KitchenOrderStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: ['paid'],
  paid: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export const ORDER_CHANNELS = ['dine-in', 'takeaway', 'whatsapp'] as const;
export const OrderChannelSchema = z.enum(ORDER_CHANNELS);
export type OrderChannel = z.infer<typeof OrderChannelSchema>;

export const QUICK_NOTES = ['no-sugar', 'takeaway', 'lactose-free', 'sweetener'] as const;
export const QuickNoteSchema = z.enum(QUICK_NOTES);
export type QuickNote = z.infer<typeof QuickNoteSchema>;

export const OrderItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string().min(1),
  unitPriceClp: PriceClpSchema,
  quantity: z.int().positive().max(99),
  quickNotes: z.array(QuickNoteSchema),
  note: z.string().max(140).nullable(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.uuid(),
  channel: OrderChannelSchema,
  status: OrderStatusSchema,
  tableId: z.uuid().nullable(),
  tableLabel: z.string().nullable(),
  customerName: z.string().max(60).nullable(),
  pickupAt: z.iso.datetime().nullable(),
  items: z.array(OrderItemSchema).min(1),
  totalClp: PriceClpSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListFilterSchema = z.object({
  status: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(OrderStatusSchema).min(1))
    .optional(),
  channel: OrderChannelSchema.optional(),
});
export type OrderListFilter = z.infer<typeof OrderListFilterSchema>;

export const CreateOrderItemInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.int().positive().max(99),
  quickNotes: z.array(QuickNoteSchema).default([]),
  note: z.string().trim().max(140).nullable().default(null),
});
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInputSchema>;

export const CreateOrderInputSchema = z
  .object({
    channel: OrderChannelSchema,
    tableId: z.uuid().nullable().default(null),
    customerName: z.string().trim().min(1).max(60).nullable().default(null),
    pickupAt: z.iso.datetime().nullable().default(null),
    items: z.array(CreateOrderItemInputSchema).min(1),
  })
  .refine((input) => input.channel !== 'dine-in' || input.tableId !== null, {
    message: 'Un pedido en mesa requiere tableId',
    path: ['tableId'],
  })
  .refine((input) => input.channel !== 'whatsapp' || input.customerName !== null, {
    message: 'Un pedido por WhatsApp requiere customerName',
    path: ['customerName'],
  });
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const UpdateOrderStatusInputSchema = z.object({
  status: OrderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>;
