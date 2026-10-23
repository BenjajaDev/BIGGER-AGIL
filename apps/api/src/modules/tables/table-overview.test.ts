import type { DiningTable, Order, OrderItem } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { buildTableOverview, deriveTableStatus } from './table-overview.js';

const table: DiningTable = { id: 't-1', number: 4, label: 'Mesa 4', sortOrder: 4 };

function item(quantity: number): OrderItem {
  return {
    id: `i-${quantity}`,
    productId: 'p-1',
    productName: 'Capuchino',
    unitPriceClp: 2500,
    quantity,
    quickNotes: [],
    note: null,
    options: [],
  };
}

function openOrder(
  status: Order['status'],
  createdAt: string,
  items: OrderItem[],
): Pick<Order, 'status' | 'items' | 'totalClp' | 'createdAt'> {
  return {
    status,
    createdAt,
    items,
    totalClp: items.reduce((sum, line) => sum + line.unitPriceClp * line.quantity, 0),
  };
}

describe('deriveTableStatus', () => {
  it('is free without open orders', () => {
    expect(deriveTableStatus([])).toBe('free');
  });

  it('awaits payment once every open order was delivered', () => {
    expect(deriveTableStatus([openOrder('delivered', '2026-10-21T12:00:00.000Z', [item(1)])])).toBe(
      'awaiting-payment',
    );
  });

  it('stays occupied while any order is still in the kitchen', () => {
    expect(
      deriveTableStatus([
        openOrder('delivered', '2026-10-21T12:00:00.000Z', [item(1)]),
        openOrder('preparing', '2026-10-21T12:05:00.000Z', [item(1)]),
      ]),
    ).toBe('occupied');
  });
});

describe('buildTableOverview', () => {
  it('aggregates items, totals, payments and the oldest open order', () => {
    const overview = buildTableOverview(table, {
      id: 'c-1',
      paidClp: 2500,
      balanceClp: 5000,
      orders: [
        openOrder('preparing', '2026-10-21T12:05:00.000Z', [item(2)]),
        openOrder('new', '2026-10-21T12:00:00.000Z', [item(1)]),
      ],
    });

    expect(overview).toMatchObject({
      status: 'occupied',
      checkId: 'c-1',
      itemCount: 3,
      openTotalClp: 7500,
      paidClp: 2500,
      balanceClp: 5000,
      openSince: '2026-10-21T12:00:00.000Z',
    });
  });

  it('returns an empty summary for a free table', () => {
    expect(buildTableOverview(table, null)).toMatchObject({
      status: 'free',
      checkId: null,
      itemCount: 0,
      openTotalClp: 0,
      openSince: null,
    });
  });
});
