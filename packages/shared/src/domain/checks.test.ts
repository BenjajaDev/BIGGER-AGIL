import { describe, expect, it } from 'vitest';
import {
  checkLines,
  CreatePaymentInputSchema,
  isCheckSettled,
  priceItemSelection,
  splitEvenly,
  suggestedTipClp,
  summarizeCheck,
} from './checks.js';

const ids = {
  order1: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  order2: '1c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  cafe: '2c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  luco: '3c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  pie: '4c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
};

const item = (
  id: string,
  productName: string,
  unitPriceClp: number,
  quantity: number,
  extra = 0,
) => ({
  id,
  productName,
  unitPriceClp,
  quantity,
  options:
    extra > 0
      ? [{ kind: 'modifier' as const, label: 'Extras', name: 'Palta', priceDeltaClp: extra }]
      : [],
});

// Table 1: Juan ordered 2 cafés and a Luco with palta; Ana arrived later and ordered a pie.
const juanOrder = {
  id: ids.order1,
  status: 'delivered' as const,
  items: [item(ids.cafe, 'Café', 1500, 2), item(ids.luco, 'Luco', 3990, 1, 600)],
  totalClp: 1500 * 2 + 3990 + 600,
};
const anaOrder = {
  id: ids.order2,
  status: 'preparing' as const,
  items: [item(ids.pie, 'Pie limón', 2500, 1)],
  totalClp: 2500,
};
const orders = [juanOrder, anaOrder];

const payment = (
  amountClp: number,
  items: { orderItemId: string; quantity: number; amountClp: number }[] = [],
) => ({
  amountClp,
  tipClp: 0,
  items,
  voidedAt: null,
});

describe('check rules', () => {
  it('bills each line with its extras and tracks the units already paid', () => {
    const lines = checkLines(orders, [
      payment(1500, [{ orderItemId: ids.cafe, quantity: 1, amountClp: 1500 }]),
    ]);
    expect(
      lines.map((line) => [line.productName, line.unitTotalClp, line.quantity, line.paidQuantity]),
    ).toEqual([
      ['Café', 1500, 2, 1],
      ['Luco', 4590, 1, 0],
      ['Pie limón', 2500, 1, 0],
    ]);
  });

  it('prices one person paying only their café and rejects paying it twice', () => {
    const lines = checkLines(orders, []);
    expect(priceItemSelection(lines, [{ orderItemId: ids.cafe, quantity: 1 }])).toEqual({
      ok: true,
      amountClp: 1500,
      items: [{ orderItemId: ids.cafe, quantity: 1, amountClp: 1500 }],
    });

    const afterBoth = checkLines(orders, [
      payment(3000, [{ orderItemId: ids.cafe, quantity: 2, amountClp: 3000 }]),
    ]);
    expect(priceItemSelection(afterBoth, [{ orderItemId: ids.cafe, quantity: 1 }])).toEqual({
      ok: false,
      index: 0,
      message: '«Café» ya está pagado',
    });
  });

  it('ignores voided payments and cancelled orders', () => {
    const voided = {
      ...payment(4590, [{ orderItemId: ids.luco, quantity: 1, amountClp: 4590 }]),
      voidedAt: '2026-10-23T12:00:00.000Z',
    };
    const totals = summarizeCheck(
      [juanOrder, { ...anaOrder, status: 'cancelled' as const }],
      [voided],
      { parts: null, paidParts: 0 },
    );
    expect(totals).toMatchObject({
      totalClp: 7590,
      paidClp: 0,
      balanceClp: 7590,
      remainingParts: null,
    });
    expect(totals.lines.find((line) => line.orderItemId === ids.luco)?.paidQuantity).toBe(0);
  });

  it('splits in equal parts without losing pesos and recalculates when someone orders more', () => {
    expect(splitEvenly(10001, 2)).toEqual([5000, 5001]);
    expect(splitEvenly(10090, 3)).toEqual([3363, 3363, 3364]);

    const halfPaid = summarizeCheck(orders, [payment(5045)], { parts: 2, paidParts: 1 });
    expect(halfPaid).toMatchObject({
      totalClp: 10090,
      balanceClp: 5045,
      remainingParts: 1,
      nextPartClp: 5045,
    });

    const withNewOrder = summarizeCheck(
      [...orders, { id: ids.order2, status: 'new' as const, items: [], totalClp: 1500 }],
      [payment(5045)],
      { parts: 2, paidParts: 1 },
    );
    expect(withNewOrder.nextPartClp).toBe(6545);
  });

  it('suggests a 10 % tip rounded to $10', () => {
    expect(suggestedTipClp(4590)).toBe(460);
    expect(suggestedTipClp(1500)).toBe(150);
    expect(suggestedTipClp(0)).toBe(0);
  });

  it('settles only when nothing is owed and every order was delivered', () => {
    expect(isCheckSettled(orders, 0)).toBe(false);
    expect(isCheckSettled([juanOrder, { status: 'cancelled' }], 0)).toBe(true);
    expect(isCheckSettled([juanOrder], 100)).toBe(false);
  });
});

describe('CreatePaymentInputSchema', () => {
  const base = { mode: 'full', expectedAmountClp: 10090 };

  it('requires the amount received in cash and forbids it otherwise', () => {
    expect(CreatePaymentInputSchema.safeParse({ ...base, method: 'cash' }).success).toBe(false);
    expect(
      CreatePaymentInputSchema.safeParse({ ...base, method: 'cash', receivedClp: 20000 }).success,
    ).toBe(true);
    expect(
      CreatePaymentInputSchema.safeParse({ ...base, method: 'debit', receivedClp: 20000 }).success,
    ).toBe(false);
  });

  it('rejects a tip paid with JUNAEB', () => {
    const result = CreatePaymentInputSchema.safeParse({ ...base, method: 'junaeb', tipClp: 1000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['tipClp']);
  });

  it('requires distinct products in an item payment', () => {
    const items = [
      { orderItemId: ids.cafe, quantity: 1 },
      { orderItemId: ids.cafe, quantity: 1 },
    ];
    expect(
      CreatePaymentInputSchema.safeParse({ ...base, mode: 'items', method: 'debit', items })
        .success,
    ).toBe(false);
  });
});
