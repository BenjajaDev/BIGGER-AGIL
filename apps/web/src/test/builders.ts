import type { Order, TableOverview } from '@bigger/shared';

let sequence = 0;

/** A valid UUID per call, so fixtures pass the same schemas as the API responses. */
export function nextId(): string {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

export function buildTable(overrides: Partial<TableOverview> = {}): TableOverview {
  const number = overrides.number ?? 1;
  return {
    id: nextId(),
    number,
    label: `Mesa ${number}`,
    sortOrder: number,
    status: 'free',
    checkId: null,
    itemCount: 0,
    openTotalClp: 0,
    paidClp: 0,
    balanceClp: 0,
    openSince: null,
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: nextId(),
    channel: 'dine-in',
    status: 'new',
    checkId: nextId(),
    tableId: nextId(),
    tableLabel: 'Mesa 2',
    customerName: null,
    pickupAt: null,
    items: [
      {
        id: nextId(),
        productId: nextId(),
        productName: 'Capuchino',
        unitPriceClp: 2500,
        quantity: 2,
        quickNotes: [],
        note: null,
        options: [],
      },
    ],
    totalClp: 5000,
    createdAt: '2026-10-21T12:00:00.000Z',
    updatedAt: '2026-10-21T12:00:00.000Z',
    ...overrides,
  };
}
