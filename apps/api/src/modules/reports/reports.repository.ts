import type { CashCloseRecord } from '@bigger/shared';
import { and, eq, gte, isNull, lt, ne } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { cashCloses, orderItems, orders, payments, products } from '../../db/schema.js';
import type { PaymentRecord, SoldLine } from './sales-report.js';

export interface NewCashClose {
  date: string;
  expectedCashClp: number;
  countedCashClp: number;
  differenceClp: number;
  note: string;
}

export interface ReportsRepository {
  /** Payments created between the two instants (voided ones included: the trail stays). */
  paymentsBetween: (from: Date, to: Date) => Promise<PaymentRecord[]>;
  /** Lines of the orders taken between the two instants, cancelled orders left out. */
  soldLinesBetween: (from: Date, to: Date) => Promise<SoldLine[]>;
  menuProductNames: () => Promise<string[]>;
  findClose: (date: string) => Promise<CashCloseRecord | null>;
  saveClose: (close: NewCashClose) => Promise<CashCloseRecord>;
}

function toRecord(row: typeof cashCloses.$inferSelect): CashCloseRecord {
  return {
    countedCashClp: row.countedCashClp,
    expectedCashClp: row.expectedCashClp,
    differenceClp: row.differenceClp,
    note: row.note,
    closedAt: row.createdAt.toISOString(),
  };
}

export class DrizzleReportsRepository implements ReportsRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  paymentsBetween(from: Date, to: Date): Promise<PaymentRecord[]> {
    return this.#db
      .select({
        method: payments.method,
        amountClp: payments.amountClp,
        tipClp: payments.tipClp,
        createdAt: payments.createdAt,
        voidedAt: payments.voidedAt,
        voidReason: payments.voidReason,
      })
      .from(payments)
      .where(and(gte(payments.createdAt, from), lt(payments.createdAt, to)));
  }

  soldLinesBetween(from: Date, to: Date): Promise<SoldLine[]> {
    return this.#db
      .select({
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPriceClp: orderItems.unitPriceClp,
        orderId: orders.id,
        orderedAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(gte(orders.createdAt, from), lt(orders.createdAt, to), ne(orders.status, 'cancelled')),
      )
      .then((rows) =>
        rows.map(({ unitPriceClp, ...row }) => ({
          ...row,
          lineTotalClp: unitPriceClp * row.quantity,
        })),
      );
  }

  async menuProductNames(): Promise<string[]> {
    const rows = await this.#db
      .select({ name: products.name })
      .from(products)
      .where(and(isNull(products.archivedAt), eq(products.kind, 'single')));
    return rows.map((row) => row.name);
  }

  async findClose(date: string): Promise<CashCloseRecord | null> {
    const [row] = await this.#db.select().from(cashCloses).where(eq(cashCloses.date, date));
    return row ? toRecord(row) : null;
  }

  async saveClose(close: NewCashClose): Promise<CashCloseRecord> {
    const [row] = await this.#db.insert(cashCloses).values(close).returning();
    if (!row) throw new Error('No se pudo guardar el cierre de caja');
    return toRecord(row);
  }
}
