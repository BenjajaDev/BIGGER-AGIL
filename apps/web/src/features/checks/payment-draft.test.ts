import type { CheckLine } from '@bigger/shared';
import {
  cashShortcuts,
  INITIAL_PAYMENT_DRAFT,
  paymentBlocker,
  paymentTotals,
  selectWholeOrder,
  toPaymentInput,
  type PaymentDraft,
} from './payment-draft';

const line = (
  orderItemId: string,
  orderId: string,
  unitTotalClp: number,
  quantity: number,
  paidQuantity = 0,
): CheckLine => ({
  orderId,
  orderItemId,
  productName: orderItemId,
  unitTotalClp,
  quantity,
  paidQuantity,
});

// Juan: 2 cafés ($1.500) and a Luco ($3.990); Ana: a pie ($2.500).
const check = {
  balanceClp: 9490,
  nextPartClp: null,
  lines: [
    line('cafe', 'juan', 1500, 2),
    line('luco', 'juan', 3990, 1),
    line('pie', 'ana', 2500, 1),
  ],
};

const draft = (overrides: Partial<PaymentDraft>): PaymentDraft => ({
  ...INITIAL_PAYMENT_DRAFT,
  ...overrides,
});

describe('payment draft', () => {
  it('charges the whole balance with a suggested 10 % tip and computes the change', () => {
    expect(paymentTotals(check, draft({ method: 'cash', receivedClp: 20_000 }))).toEqual({
      amountClp: 9490,
      tipClp: 950,
      dueClp: 10_440,
      changeClp: 9560,
    });
  });

  it('never adds a tip with JUNAEB and lets the tip be edited or removed', () => {
    expect(paymentTotals(check, draft({ method: 'junaeb' })).tipClp).toBe(0);
    expect(paymentTotals(check, draft({ method: 'debit', customTipClp: 2000 })).tipClp).toBe(2000);
    expect(paymentTotals(check, draft({ method: 'debit', tipEnabled: false })).tipClp).toBe(0);
  });

  it('prices only the chosen units when someone pays their own items', () => {
    const units = selectWholeOrder(check, {}, 'ana');
    expect(units).toEqual({ pie: 1 });
    const itemsDraft = draft({
      mode: 'items',
      units: { ...units, cafe: 1 },
      method: 'debit',
      tipEnabled: false,
    });
    expect(paymentTotals(check, itemsDraft).amountClp).toBe(4000);
    expect(toPaymentInput(check, itemsDraft)).toEqual({
      mode: 'items',
      method: 'debit',
      tipClp: 0,
      receivedClp: null,
      expectedAmountClp: 4000,
      items: [
        { orderItemId: 'pie', quantity: 1 },
        { orderItemId: 'cafe', quantity: 1 },
      ],
    });
  });

  it('selects only what is still unpaid of a person’s order', () => {
    const partlyPaid = {
      lines: [line('cafe', 'juan', 1500, 2, 1), line('luco', 'juan', 3990, 1, 1)],
    };
    expect(selectWholeOrder(partlyPaid, {}, 'juan')).toEqual({ cafe: 1, luco: 0 });
  });

  it('says what is missing before the charge can be made', () => {
    expect(paymentBlocker(check, draft({ mode: 'items' }))).toBe('Elige qué productos se pagan');
    expect(paymentBlocker(check, draft({ mode: 'equal' }))).toBe('Elige en cuántas partes');
    expect(paymentBlocker(check, draft({}))).toBe('Elige el medio de pago');
    expect(paymentBlocker(check, draft({ method: 'cash', receivedClp: 5000 }))).toBe(
      'Ingresa cuánto recibes: al menos $ 10.440',
    );
    expect(paymentBlocker(check, draft({ method: 'debit' }))).toBeNull();
  });

  it('charges the next equal part when the bill is split', () => {
    const split = { ...check, nextPartClp: 4745 };
    expect(
      toPaymentInput(split, draft({ mode: 'equal', method: 'debit', tipEnabled: false })),
    ).toEqual({
      mode: 'equal',
      method: 'debit',
      tipClp: 0,
      receivedClp: null,
      expectedAmountClp: 4745,
    });
  });

  it('offers the exact amount and the bills a customer usually hands over', () => {
    expect(cashShortcuts(10_440)).toEqual([10_440, 11_000, 12_000, 15_000]);
    expect(cashShortcuts(4000)).toEqual([4000, 5000, 10_000, 20_000]);
    expect(cashShortcuts(0)).toEqual([]);
  });
});
