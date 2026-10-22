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

export const ORDER_ITEM_OPTION_KINDS = ['size', 'modifier', 'combo'] as const;
export const OrderItemOptionKindSchema = z.enum(ORDER_ITEM_OPTION_KINDS);
export type OrderItemOptionKind = z.infer<typeof OrderItemOptionKindSchema>;

/** A chosen customization or combo pick, snapshot with the name and price it was sold at. */
export const OrderItemOptionSchema = z.object({
  kind: OrderItemOptionKindSchema,
  /** The group ("Tipo de leche") or combo slot ("Café a elección") it belongs to. */
  label: z.string().min(1),
  /** The chosen option ("Almendra") or product ("Cortado"). */
  name: z.string().min(1),
  priceDeltaClp: PriceClpSchema,
});
export type OrderItemOption = z.infer<typeof OrderItemOptionSchema>;

export const OrderItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string().min(1),
  /** Base price per unit; the extras are listed in `options`. */
  unitPriceClp: PriceClpSchema,
  quantity: z.int().positive().max(99),
  quickNotes: z.array(QuickNoteSchema),
  note: z.string().max(140).nullable(),
  options: z.array(OrderItemOptionSchema),
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

/** The client sends only ids; the server resolves the name and price from the catalog. */
export const ChosenModifierSchema = z.object({
  groupId: z.uuid(),
  optionId: z.uuid(),
});
export type ChosenModifier = z.infer<typeof ChosenModifierSchema>;

export const ChosenComboOptionSchema = z.object({
  slotId: z.uuid(),
  productId: z.uuid(),
});
export type ChosenComboOption = z.infer<typeof ChosenComboOptionSchema>;

export const CreateOrderItemInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.int().positive().max(99),
  quickNotes: z.array(QuickNoteSchema).default([]),
  note: z.string().trim().max(140).nullable().default(null),
  /** Required when the product has sizes; the size sets the price and the customization rules. */
  sizeId: z.uuid().nullable().default(null),
  options: z.array(ChosenModifierSchema).default([]),
  comboChoices: z.array(ChosenComboOptionSchema).default([]),
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
