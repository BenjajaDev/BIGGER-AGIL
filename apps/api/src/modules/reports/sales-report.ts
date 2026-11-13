import {
  PAYMENT_METHODS,
  type CashCloseSummary,
  type PaymentMethod,
  type ReportRange,
  type SalesReport,
  type SalesTotals,
} from '@bigger/shared';
import { addDays, daysInRange, localDate, spanDays } from './local-date.js';

export interface PaymentRecord {
  method: PaymentMethod;
  amountClp: number;
  tipClp: number;
  createdAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
}

/** One sold line, with the moment its order was taken. */
export interface SoldLine {
  productName: string;
  quantity: number;
  lineTotalClp: number;
  orderId: string;
  orderedAt: Date;
}

export interface ReportData {
  payments: readonly PaymentRecord[];
  lines: readonly SoldLine[];
  /** Names of the products still on the menu, so products that never sold show up as slow. */
  menuProductNames: readonly string[];
}

const TOP_PRODUCTS = 5;
const SLOW_PRODUCTS = 5;

function within(date: string, range: ReportRange): boolean {
  return date >= range.from && date <= range.to;
}

function totalsFor(range: ReportRange, data: ReportData, timeZone: string): SalesTotals {
  const paid = data.payments.filter(
    (payment) => payment.voidedAt === null && within(localDate(payment.createdAt, timeZone), range),
  );
  const salesClp = paid.reduce((sum, payment) => sum + payment.amountClp, 0);
  const tipsClp = paid.reduce((sum, payment) => sum + payment.tipClp, 0);
  const orderIds = new Set(
    data.lines
      .filter((line) => within(localDate(line.orderedAt, timeZone), range))
      .map((line) => line.orderId),
  );
  const orders = orderIds.size;
  return {
    salesClp,
    tipsClp,
    orders,
    averageTicketClp: orders === 0 ? 0 : Math.round(salesClp / orders),
  };
}

export function previousRange(range: ReportRange): ReportRange {
  const length = spanDays(range.from, range.to);
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

export function buildSalesReport(
  range: ReportRange,
  data: ReportData,
  timeZone: string,
): SalesReport {
  const paid = data.payments.filter(
    (payment) => payment.voidedAt === null && within(localDate(payment.createdAt, timeZone), range),
  );

  const byMethod = PAYMENT_METHODS.map((method) => {
    const ofMethod = paid.filter((payment) => payment.method === method);
    return {
      method,
      amountClp: ofMethod.reduce((sum, payment) => sum + payment.amountClp, 0),
      payments: ofMethod.length,
    };
  });

  const byDay = daysInRange(range.from, range.to).map((date) => ({
    date,
    salesClp: paid
      .filter((payment) => localDate(payment.createdAt, timeZone) === date)
      .reduce((sum, payment) => sum + payment.amountClp, 0),
    orders: new Set(
      data.lines
        .filter((line) => localDate(line.orderedAt, timeZone) === date)
        .map((line) => line.orderId),
    ).size,
  }));

  const sold = new Map<string, { quantity: number; revenueClp: number }>();
  for (const line of data.lines) {
    if (!within(localDate(line.orderedAt, timeZone), range)) continue;
    const entry = sold.get(line.productName) ?? { quantity: 0, revenueClp: 0 };
    entry.quantity += line.quantity;
    entry.revenueClp += line.lineTotalClp;
    sold.set(line.productName, entry);
  }
  const ranked = [...sold].map(([name, value]) => ({ name, ...value }));
  const topProducts = [...ranked]
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'es'))
    .slice(0, TOP_PRODUCTS);
  const slowProducts = data.menuProductNames
    .map((name) => ({ name, quantity: sold.get(name)?.quantity ?? 0 }))
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name, 'es'))
    .slice(0, SLOW_PRODUCTS);

  return {
    range,
    totals: totalsFor(range, data, timeZone),
    previous: totalsFor(previousRange(range), data, timeZone),
    byMethod,
    byDay,
    topProducts,
    slowProducts,
  };
}

export function buildCashClose(
  date: string,
  payments: readonly PaymentRecord[],
  timeZone: string,
): Omit<CashCloseSummary, 'close'> {
  const ofDay = payments.filter((payment) => localDate(payment.createdAt, timeZone) === date);
  const valid = ofDay.filter((payment) => payment.voidedAt === null);
  const byMethod = PAYMENT_METHODS.map((method) => {
    const ofMethod = valid.filter((payment) => payment.method === method);
    return {
      method,
      amountClp: ofMethod.reduce((sum, payment) => sum + payment.amountClp, 0),
      tipsClp: ofMethod.reduce((sum, payment) => sum + payment.tipClp, 0),
      payments: ofMethod.length,
    };
  });
  const cash = byMethod.find((entry) => entry.method === 'cash');
  return {
    date,
    byMethod,
    salesClp: byMethod.reduce((sum, entry) => sum + entry.amountClp, 0),
    tipsClp: byMethod.reduce((sum, entry) => sum + entry.tipsClp, 0),
    expectedCashClp: (cash?.amountClp ?? 0) + (cash?.tipsClp ?? 0),
    voided: ofDay
      .filter((payment) => payment.voidedAt !== null)
      .map((payment) => ({
        method: payment.method,
        amountClp: payment.amountClp,
        reason: payment.voidReason ?? '',
      })),
  };
}
