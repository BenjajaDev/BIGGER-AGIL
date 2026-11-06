import { buildOrder, buildTable } from '../../test/builders';
import {
  attentionItems,
  filterTables,
  kitchenLanes,
  openFigures,
  NEW_ORDER_ALERT_MINUTES,
} from './summary-model';

const now = new Date('2026-10-21T12:30:00.000Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe('kitchenLanes', () => {
  it('counts each lane and finds the longest wait', () => {
    const lanes = kitchenLanes([
      buildOrder({ status: 'new', createdAt: minutesAgo(4) }),
      buildOrder({ status: 'new', createdAt: minutesAgo(12) }),
      buildOrder({ status: 'ready', createdAt: minutesAgo(2) }),
    ]);
    expect(lanes.map((lane) => [lane.status, lane.count])).toEqual([
      ['new', 2],
      ['preparing', 0],
      ['ready', 1],
    ]);
    expect(lanes[0]?.oldestSince).toBe(minutesAgo(12));
    expect(lanes[1]?.oldestSince).toBeNull();
  });
});

describe('attentionItems', () => {
  const tableToPay = buildTable({ number: 4, status: 'awaiting-payment', balanceClp: 9490 });

  it('puts the printer first, then slow orders, ready orders and tables to charge', () => {
    const items = attentionItems({
      tables: [tableToPay, buildTable({ number: 1 })],
      orders: [
        buildOrder({ status: 'ready', tableLabel: 'Mesa 2', createdAt: minutesAgo(15) }),
        buildOrder({
          status: 'new',
          tableLabel: 'Mesa 3',
          createdAt: minutesAgo(NEW_ORDER_ALERT_MINUTES + 2),
        }),
      ],
      printer: { enabled: true, failed: 2 },
      now,
    });
    expect(items.map((item) => item.kind)).toEqual([
      'printer-failed',
      'order-waiting',
      'order-ready',
      'table-to-pay',
    ]);
    expect(items[0]?.title).toBe('2 comandas sin imprimir');
    expect(items[1]?.title).toBe('Mesa 3 espera hace 12 min');
    expect(items[3]).toMatchObject({
      title: 'Mesa 4 por cobrar',
      to: `/mesas/${tableToPay.id}`,
      actionLabel: 'Cobrar',
    });
    expect(items[3]?.detail).toMatch(/9\.490/);
  });

  it('stays quiet when nothing needs anyone', () => {
    expect(
      attentionItems({
        tables: [buildTable()],
        orders: [buildOrder({ status: 'new', createdAt: minutesAgo(3) })],
        printer: { enabled: true, failed: 0 },
        now,
      }),
    ).toEqual([]);
  });

  it('ignores the printer while printing is off and caps the list', () => {
    const tables = Array.from({ length: 10 }, (_, index) =>
      buildTable({ number: index + 1, status: 'awaiting-payment' }),
    );
    const items = attentionItems({
      tables,
      orders: [],
      printer: { enabled: false, failed: 3 },
      now,
    });
    expect(items).toHaveLength(6);
    expect(items.some((item) => item.kind === 'printer-failed')).toBe(false);
  });
});

describe('openFigures and filterTables', () => {
  const tables = [
    buildTable({ number: 1 }),
    buildTable({ number: 2, status: 'occupied', openTotalClp: 5000, balanceClp: 5000 }),
    buildTable({ number: 3, status: 'awaiting-payment', openTotalClp: 8000, balanceClp: 3000 }),
  ];

  it('adds what is open and what is left to charge', () => {
    expect(openFigures(tables)).toEqual({
      openChecks: 2,
      openTotalClp: 13_000,
      toCollectClp: 8000,
    });
  });

  it('filters the map by state', () => {
    expect(filterTables(tables, 'all')).toHaveLength(3);
    expect(filterTables(tables, 'occupied').map((table) => table.number)).toEqual([2, 3]);
    expect(filterTables(tables, 'to-pay').map((table) => table.number)).toEqual([3]);
  });
});
