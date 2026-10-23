import {
  suggestedTipClp,
  type Check,
  type CreatePaymentInput,
  type PaymentMethod,
  type PaymentMode,
} from '@bigger/shared';
import { formatClp } from '../../lib/format';

/** What the cashier is filling in; every amount is derived from the live check. */
export interface PaymentDraft {
  mode: PaymentMode;
  /** Units chosen per order line, for `items`. */
  units: Readonly<Record<string, number>>;
  method: PaymentMethod | null;
  tipEnabled: boolean;
  /** `null` keeps the suggested 10 %. */
  customTipClp: number | null;
  receivedClp: number | null;
}

export const INITIAL_PAYMENT_DRAFT: PaymentDraft = {
  mode: 'full',
  units: {},
  method: null,
  tipEnabled: true,
  customTipClp: null,
  receivedClp: null,
};

type CheckAmounts = Pick<Check, 'balanceClp' | 'nextPartClp' | 'lines'>;

export function paymentAmountClp(check: CheckAmounts, draft: PaymentDraft): number {
  switch (draft.mode) {
    case 'full':
      return check.balanceClp;
    case 'equal':
      return check.nextPartClp ?? 0;
    case 'items':
      return check.lines.reduce(
        (sum, line) => sum + line.unitTotalClp * (draft.units[line.orderItemId] ?? 0),
        0,
      );
  }
}

/** JUNAEB only covers food, so it never carries a tip. */
export function tipAllowed(method: PaymentMethod | null): boolean {
  return method !== 'junaeb';
}

export function paymentTipClp(amountClp: number, draft: PaymentDraft): number {
  if (!draft.tipEnabled || !tipAllowed(draft.method)) return 0;
  return draft.customTipClp ?? suggestedTipClp(amountClp);
}

export interface PaymentTotals {
  amountClp: number;
  tipClp: number;
  dueClp: number;
  /** Cash only, once enough was received. */
  changeClp: number | null;
}

export function paymentTotals(check: CheckAmounts, draft: PaymentDraft): PaymentTotals {
  const amountClp = paymentAmountClp(check, draft);
  const tipClp = paymentTipClp(amountClp, draft);
  const dueClp = amountClp + tipClp;
  const changeClp =
    draft.method === 'cash' && draft.receivedClp !== null && draft.receivedClp >= dueClp
      ? draft.receivedClp - dueClp
      : null;
  return { amountClp, tipClp, dueClp, changeClp };
}

/** The first thing still missing before charging, in the words shown under the button. */
export function paymentBlocker(check: CheckAmounts, draft: PaymentDraft): string | null {
  const { amountClp, dueClp } = paymentTotals(check, draft);
  if (draft.mode === 'items' && amountClp === 0) return 'Elige qué productos se pagan';
  if (draft.mode === 'equal' && check.nextPartClp === null) return 'Elige en cuántas partes';
  if (amountClp > check.balanceClp) return `Supera el saldo de ${formatClp(check.balanceClp)}`;
  if (draft.method === null) return 'Elige el medio de pago';
  if (draft.method === 'cash' && (draft.receivedClp ?? 0) < dueClp) {
    return `Ingresa cuánto recibes: al menos ${formatClp(dueClp)}`;
  }
  return null;
}

export function toPaymentInput(check: CheckAmounts, draft: PaymentDraft): CreatePaymentInput {
  const { amountClp, tipClp } = paymentTotals(check, draft);
  const method = draft.method ?? 'cash';
  const base = {
    method,
    tipClp,
    receivedClp: method === 'cash' ? draft.receivedClp : null,
    expectedAmountClp: amountClp,
  };
  if (draft.mode !== 'items') return { mode: draft.mode, ...base };
  return {
    mode: 'items',
    ...base,
    items: Object.entries(draft.units)
      .filter(([, quantity]) => quantity > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
  };
}

const CASH_STEPS = [1000, 2000, 5000, 10_000, 20_000];

/** Exact amount plus the bills a customer is likely to hand over. */
export function cashShortcuts(dueClp: number): number[] {
  if (dueClp <= 0) return [];
  const rounded = CASH_STEPS.map((step) => Math.ceil(dueClp / step) * step);
  return [...new Set([dueClp, ...rounded])].sort((a, b) => a - b).slice(0, 4);
}

/** Selects every unit still unpaid of one order ("Juan pays what he ordered"). */
export function selectWholeOrder(
  check: Pick<Check, 'lines'>,
  units: Readonly<Record<string, number>>,
  orderId: string,
): Record<string, number> {
  const next = { ...units };
  for (const line of check.lines.filter((candidate) => candidate.orderId === orderId)) {
    next[line.orderItemId] = line.quantity - line.paidQuantity;
  }
  return next;
}
