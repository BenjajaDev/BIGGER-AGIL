import {
  KITCHEN_ORDER_STATUSES,
  type KitchenOrderStatus,
  type Order,
  type PrinterStatus,
  type TableOverview,
} from '@bigger/shared';
import { formatClp, minutesSince, pluralize } from '../../lib/format';
import { orderTitle } from '../orders/order-text';

/** A new order waiting this long without being picked up is worth a nudge. */
export const NEW_ORDER_ALERT_MINUTES = 10;
const MAX_ATTENTION_ITEMS = 6;

export interface KitchenLane {
  status: KitchenOrderStatus;
  count: number;
  /** When the longest-waiting order of the lane arrived. */
  oldestSince: string | null;
}

export function kitchenLanes(orders: readonly Order[]): KitchenLane[] {
  return KITCHEN_ORDER_STATUSES.map((status) => {
    const inLane = orders.filter((order) => order.status === status);
    const oldest = inLane.reduce<string | null>(
      (earliest, order) =>
        earliest === null || order.createdAt < earliest ? order.createdAt : earliest,
      null,
    );
    return { status, count: inLane.length, oldestSince: oldest };
  });
}

export type AttentionKind = 'printer-failed' | 'order-waiting' | 'order-ready' | 'table-to-pay';

export interface AttentionItem {
  key: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  to: string;
  actionLabel: string;
}

export interface AttentionInput {
  tables: readonly TableOverview[];
  orders: readonly Order[];
  printer: Pick<PrinterStatus, 'enabled' | 'failed'> | undefined;
  now: Date;
}

/** What needs someone right now, most urgent first, each with a single action. */
export function attentionItems({ tables, orders, printer, now }: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (printer?.enabled && printer.failed > 0) {
    items.push({
      key: 'printer-failed',
      kind: 'printer-failed',
      title: pluralize(printer.failed, 'comanda sin imprimir', 'comandas sin imprimir'),
      detail: 'La cocina no la recibió en papel.',
      to: '/configuracion/impresora',
      actionLabel: 'Revisar impresora',
    });
  }

  const byAge = (a: Order, b: Order) => a.createdAt.localeCompare(b.createdAt);
  for (const order of orders.filter((o) => o.status === 'new').sort(byAge)) {
    const waited = minutesSince(order.createdAt, now);
    if (waited < NEW_ORDER_ALERT_MINUTES) continue;
    items.push({
      key: `waiting-${order.id}`,
      kind: 'order-waiting',
      title: `${orderTitle(order)} espera hace ${waited} min`,
      detail: 'Nadie lo ha tomado en cocina.',
      to: '/cocina',
      actionLabel: 'Ir a Cocina',
    });
  }

  for (const order of orders.filter((o) => o.status === 'ready').sort(byAge)) {
    items.push({
      key: `ready-${order.id}`,
      kind: 'order-ready',
      title: `${orderTitle(order)} está listo`,
      detail: 'Falta llevarlo a la mesa.',
      to: '/cocina',
      actionLabel: 'Ver en Cocina',
    });
  }

  for (const table of tables.filter((t) => t.status === 'awaiting-payment')) {
    items.push({
      key: `pay-${table.id}`,
      kind: 'table-to-pay',
      title: `${table.label} por cobrar`,
      detail: `Saldo ${formatClp(table.balanceClp)}`,
      to: `/mesas/${table.id}`,
      actionLabel: 'Cobrar',
    });
  }

  return items.slice(0, MAX_ATTENTION_ITEMS);
}

export interface OpenFigures {
  openChecks: number;
  openTotalClp: number;
  toCollectClp: number;
}

/** Money still on the tables: what customers have ordered and what is left to charge. */
export function openFigures(tables: readonly TableOverview[]): OpenFigures {
  const open = tables.filter((table) => table.status !== 'free');
  return {
    openChecks: open.length,
    openTotalClp: open.reduce((sum, table) => sum + table.openTotalClp, 0),
    toCollectClp: open.reduce((sum, table) => sum + table.balanceClp, 0),
  };
}

export const TABLE_FILTERS = ['all', 'occupied', 'to-pay'] as const;
export type TableFilter = (typeof TABLE_FILTERS)[number];

export const TABLE_FILTER_LABELS: Readonly<Record<TableFilter, string>> = {
  all: 'Todas',
  occupied: 'Ocupadas',
  'to-pay': 'Por cobrar',
};

export function filterTables(
  tables: readonly TableOverview[],
  filter: TableFilter,
): TableOverview[] {
  switch (filter) {
    case 'all':
      return [...tables];
    case 'occupied':
      return tables.filter((table) => table.status !== 'free');
    case 'to-pay':
      return tables.filter((table) => table.status === 'awaiting-payment');
  }
}
