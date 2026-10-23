import { z } from 'zod';
import { PriceClpSchema } from './catalog.js';
import { OrderSchema, type Order, type OrderItem } from './orders.js';

export const PAYMENT_METHODS = ['cash', 'debit', 'junaeb'] as const;
export const PaymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/** `full` pays the whole balance, `items` chosen units, `equal` the next equal part. */
export const PAYMENT_MODES = ['full', 'items', 'equal'] as const;
export const PaymentModeSchema = z.enum(PAYMENT_MODES);
export type PaymentMode = z.infer<typeof PaymentModeSchema>;

export const CHECK_STATUSES = ['open', 'closed'] as const;
export const CheckStatusSchema = z.enum(CHECK_STATUSES);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const MIN_SPLIT_PARTS = 2;
export const MAX_SPLIT_PARTS = 20;
export const SUGGESTED_TIP_RATE = 0.1;

export const PaymentItemSchema = z.object({
  orderItemId: z.uuid(),
  quantity: z.int().positive(),
  amountClp: PriceClpSchema,
});
export type PaymentItem = z.infer<typeof PaymentItemSchema>;

export const PaymentSchema = z.object({
  id: z.uuid(),
  method: PaymentMethodSchema,
  mode: PaymentModeSchema,
  /** Consumption paid, without the tip. */
  amountClp: PriceClpSchema,
  tipClp: PriceClpSchema,
  /** Cash only: what the customer handed over. */
  receivedClp: PriceClpSchema.nullable(),
  changeClp: PriceClpSchema.nullable(),
  items: z.array(PaymentItemSchema),
  createdAt: z.iso.datetime(),
  voidedAt: z.iso.datetime().nullable(),
  voidReason: z.string().nullable(),
});
export type Payment = z.infer<typeof PaymentSchema>;

/** One billable line of the check with how many of its units are already paid. */
export const CheckLineSchema = z.object({
  orderId: z.uuid(),
  orderItemId: z.uuid(),
  productName: z.string(),
  /** Base price plus extras, per unit. */
  unitTotalClp: PriceClpSchema,
  quantity: z.int().positive(),
  paidQuantity: z.int().nonnegative(),
});
export type CheckLine = z.infer<typeof CheckLineSchema>;

/**
 * The bill of a table (or of a takeaway order): every order added while it is open and every
 * payment made against it. `version` changes on each write so a stale tablet cannot charge twice.
 */
export const CheckSchema = z.object({
  id: z.uuid(),
  tableId: z.uuid().nullable(),
  tableLabel: z.string().nullable(),
  status: CheckStatusSchema,
  version: z.int().nonnegative(),
  splitParts: z.int().min(MIN_SPLIT_PARTS).max(MAX_SPLIT_PARTS).nullable(),
  orders: z.array(OrderSchema),
  payments: z.array(PaymentSchema),
  lines: z.array(CheckLineSchema),
  totalClp: PriceClpSchema,
  paidClp: PriceClpSchema,
  tipClp: PriceClpSchema,
  balanceClp: PriceClpSchema,
  /** Equal parts still to be paid; `null` without a split. */
  remainingParts: z.int().nonnegative().nullable(),
  /** Amount of the next equal part; `null` without a split. */
  nextPartClp: PriceClpSchema.nullable(),
  openedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
});
export type Check = z.infer<typeof CheckSchema>;

/* ---------- Inputs ---------- */

const paymentBase = {
  method: PaymentMethodSchema,
  tipClp: PriceClpSchema.default(0),
  receivedClp: PriceClpSchema.nullable().default(null),
  /** The amount the cashier saw; if the check changed meanwhile the payment is rejected. */
  expectedAmountClp: PriceClpSchema,
};

export const PaymentItemInputSchema = z.object({
  orderItemId: z.uuid(),
  quantity: z.int().positive().max(99),
});
export type PaymentItemInput = z.infer<typeof PaymentItemInputSchema>;

export const CreatePaymentInputSchema = z
  .discriminatedUnion('mode', [
    z.object({ mode: z.literal('full'), ...paymentBase }),
    z.object({ mode: z.literal('equal'), ...paymentBase }),
    z.object({
      mode: z.literal('items'),
      ...paymentBase,
      items: z
        .array(PaymentItemInputSchema)
        .min(1, 'Elige al menos un producto')
        .refine(
          (items) => new Set(items.map((item) => item.orderItemId)).size === items.length,
          'Producto repetido',
        ),
    }),
  ])
  .superRefine((payment, ctx) => {
    if (payment.method === 'cash' && payment.receivedClp === null) {
      ctx.addIssue({ code: 'custom', message: 'Ingresa el monto recibido', path: ['receivedClp'] });
    }
    if (payment.method !== 'cash' && payment.receivedClp !== null) {
      ctx.addIssue({
        code: 'custom',
        message: 'El monto recibido solo aplica a efectivo',
        path: ['receivedClp'],
      });
    }
    if (payment.method === 'junaeb' && payment.tipClp > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'JUNAEB no admite propina: regístrala como otro pago',
        path: ['tipClp'],
      });
    }
  });
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

export const SetSplitInputSchema = z.object({
  parts: z
    .int({ error: 'Elige en cuántas partes' })
    .min(MIN_SPLIT_PARTS, `Mínimo ${MIN_SPLIT_PARTS} partes`)
    .max(MAX_SPLIT_PARTS, `Máximo ${MAX_SPLIT_PARTS} partes`)
    .nullable(),
});
export type SetSplitInput = z.infer<typeof SetSplitInputSchema>;

export const VoidPaymentInputSchema = z.object({
  reason: z.string().trim().min(3, 'Escribe el motivo').max(140, 'Máximo 140 caracteres'),
});
export type VoidPaymentInput = z.infer<typeof VoidPaymentInputSchema>;

/* ---------- Rules (shared by API and UI) ---------- */

export function lineUnitTotalClp(item: Pick<OrderItem, 'unitPriceClp' | 'options'>): number {
  return item.options.reduce((sum, option) => sum + option.priceDeltaClp, item.unitPriceClp);
}

const isActive = (payment: Pick<Payment, 'voidedAt'>) => payment.voidedAt === null;

/** Units paid per order line by item payments that were not voided. */
export function paidUnitsByItem(payments: readonly Pick<Payment, 'items' | 'voidedAt'>[]) {
  const paid = new Map<string, number>();
  for (const payment of payments.filter(isActive)) {
    for (const item of payment.items) {
      paid.set(item.orderItemId, (paid.get(item.orderItemId) ?? 0) + item.quantity);
    }
  }
  return paid;
}

/** The parts of an order the bill needs. */
export type BillableOrder = Pick<Order, 'id' | 'status' | 'totalClp'> & {
  items: readonly Pick<OrderItem, 'id' | 'productName' | 'unitPriceClp' | 'quantity' | 'options'>[];
};

/** Cancelled orders are not billed. */
export function checkLines(
  orders: readonly BillableOrder[],
  payments: readonly Pick<Payment, 'items' | 'voidedAt'>[],
): CheckLine[] {
  const paid = paidUnitsByItem(payments);
  return orders
    .filter((order) => order.status !== 'cancelled')
    .flatMap((order) =>
      order.items.map((item) => ({
        orderId: order.id,
        orderItemId: item.id,
        productName: item.productName,
        unitTotalClp: lineUnitTotalClp(item),
        quantity: item.quantity,
        paidQuantity: Math.min(paid.get(item.id) ?? 0, item.quantity),
      })),
    );
}

/** Splits an amount in whole pesos; the last part absorbs the remainder so nothing is lost. */
export function splitEvenly(totalClp: number, parts: number): number[] {
  if (parts < 1) return [];
  const base = Math.floor(totalClp / parts);
  return Array.from({ length: parts }, (_, index) =>
    index === parts - 1 ? totalClp - base * (parts - 1) : base,
  );
}

export function nextPartClp(balanceClp: number, remainingParts: number): number {
  return splitEvenly(balanceClp, Math.max(remainingParts, 1))[0] ?? 0;
}

/** 10 % of what is being paid, rounded to the nearest $10. */
export function suggestedTipClp(amountClp: number): number {
  return Math.round((amountClp * SUGGESTED_TIP_RATE) / 10) * 10;
}

export interface CheckSplit {
  parts: number | null;
  paidParts: number;
}

export interface CheckTotals {
  lines: CheckLine[];
  totalClp: number;
  paidClp: number;
  tipClp: number;
  balanceClp: number;
  remainingParts: number | null;
  nextPartClp: number | null;
}

export function summarizeCheck(
  orders: readonly BillableOrder[],
  payments: readonly Pick<Payment, 'items' | 'voidedAt' | 'amountClp' | 'tipClp'>[],
  split: CheckSplit,
): CheckTotals {
  const active = payments.filter(isActive);
  const totalClp = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.totalClp, 0);
  const paidClp = active.reduce((sum, payment) => sum + payment.amountClp, 0);
  const balanceClp = Math.max(totalClp - paidClp, 0);
  const remainingParts =
    split.parts === null ? null : balanceClp === 0 ? 0 : Math.max(split.parts - split.paidParts, 1);

  return {
    lines: checkLines(orders, payments),
    totalClp,
    paidClp,
    tipClp: active.reduce((sum, payment) => sum + payment.tipClp, 0),
    balanceClp,
    remainingParts,
    nextPartClp: remainingParts === null ? null : nextPartClp(balanceClp, remainingParts),
  };
}

/** Amount of an item payment, or the reason it cannot be made. */
export function priceItemSelection(
  lines: readonly CheckLine[],
  selection: readonly PaymentItemInput[],
):
  | { ok: true; amountClp: number; items: PaymentItem[] }
  | { ok: false; index: number; message: string } {
  const items: PaymentItem[] = [];
  for (const [index, chosen] of selection.entries()) {
    const line = lines.find((candidate) => candidate.orderItemId === chosen.orderItemId);
    if (!line) return { ok: false, index, message: 'Ese producto no está en la cuenta' };
    const pending = line.quantity - line.paidQuantity;
    if (chosen.quantity > pending) {
      return {
        ok: false,
        index,
        message:
          pending === 0
            ? `«${line.productName}» ya está pagado`
            : `Solo quedan ${pending} de «${line.productName}» por pagar`,
      };
    }
    items.push({
      orderItemId: line.orderItemId,
      quantity: chosen.quantity,
      amountClp: line.unitTotalClp * chosen.quantity,
    });
  }
  return { ok: true, amountClp: items.reduce((sum, item) => sum + item.amountClp, 0), items };
}

/** A check closes when nothing is owed and every order that is billed was delivered. */
export function isCheckSettled(
  orders: readonly Pick<Order, 'status'>[],
  balanceClp: number,
): boolean {
  return (
    balanceClp === 0 &&
    orders.every(
      (order) =>
        order.status === 'delivered' || order.status === 'cancelled' || order.status === 'paid',
    )
  );
}
