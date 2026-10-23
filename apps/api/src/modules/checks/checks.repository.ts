import type { CheckStatus, Payment, PaymentItem, PaymentMethod, PaymentMode } from '@bigger/shared';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../../db/client.js';
import { checks, diningTables, orders, paymentItems, payments } from '../../db/schema.js';

/** A check as stored: its orders are read through the orders repository. */
export interface CheckRecord {
  id: string;
  tableId: string | null;
  tableLabel: string | null;
  status: CheckStatus;
  version: number;
  splitParts: number | null;
  splitPaidParts: number;
  openedAt: Date;
  closedAt: Date | null;
  payments: Payment[];
}

export interface NewPayment {
  method: PaymentMethod;
  mode: PaymentMode;
  amountClp: number;
  tipClp: number;
  receivedClp: number | null;
  items: readonly PaymentItem[];
}

/** Every write compares `version` first: `false` means the check changed or was closed. */
export interface ChecksRepository {
  findById: (id: string) => Promise<CheckRecord | null>;
  findOpenByTable: (tableId: string) => Promise<CheckRecord | null>;
  listOpenForTables: () => Promise<CheckRecord[]>;
  findPaymentCheckId: (paymentId: string) => Promise<string | null>;
  addPayment: (checkId: string, version: number, payment: NewPayment) => Promise<boolean>;
  voidPayment: (
    checkId: string,
    version: number,
    payment: Pick<Payment, 'id' | 'mode'>,
    reason: string,
  ) => Promise<boolean>;
  setSplit: (checkId: string, version: number, parts: number | null) => Promise<boolean>;
  /** Closes the check and marks its delivered orders as paid. */
  close: (checkId: string, version: number) => Promise<boolean>;
}

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
type CheckReader = Pick<AppDatabase, 'select'>;

const checkColumns = {
  id: checks.id,
  tableId: checks.tableId,
  tableLabel: diningTables.label,
  status: checks.status,
  version: checks.version,
  splitParts: checks.splitParts,
  splitPaidParts: checks.splitPaidParts,
  openedAt: checks.createdAt,
  closedAt: checks.closedAt,
};

/** Bumps the version only if nobody else wrote since it was read and the check is still open. */
function claimOpenCheck(tx: Transaction, checkId: string, version: number, set = {}): boolean {
  const result = tx
    .update(checks)
    .set({ ...set, version: sql`${checks.version} + 1`, updatedAt: new Date() })
    .where(and(eq(checks.id, checkId), eq(checks.version, version), eq(checks.status, 'open')))
    .run();
  return result.changes === 1;
}

export class DrizzleChecksRepository implements ChecksRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async findById(id: string): Promise<CheckRecord | null> {
    return Promise.resolve(this.#read(eq(checks.id, id))[0] ?? null);
  }

  async findOpenByTable(tableId: string): Promise<CheckRecord | null> {
    return Promise.resolve(
      this.#read(and(eq(checks.tableId, tableId), eq(checks.status, 'open')))[0] ?? null,
    );
  }

  async listOpenForTables(): Promise<CheckRecord[]> {
    return Promise.resolve(
      this.#read(and(eq(checks.status, 'open'), sql`${checks.tableId} is not null`)),
    );
  }

  async findPaymentCheckId(paymentId: string): Promise<string | null> {
    const row = this.#db
      .select({ checkId: payments.checkId })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .get();
    return Promise.resolve(row?.checkId ?? null);
  }

  async addPayment(checkId: string, version: number, payment: NewPayment): Promise<boolean> {
    return Promise.resolve(
      this.#db.transaction((tx) => {
        const split =
          payment.mode === 'equal' ? { splitPaidParts: sql`${checks.splitPaidParts} + 1` } : {};
        if (!claimOpenCheck(tx, checkId, version, split)) return false;

        const paymentId = randomUUID();
        tx.insert(payments)
          .values({
            id: paymentId,
            checkId,
            method: payment.method,
            mode: payment.mode,
            amountClp: payment.amountClp,
            tipClp: payment.tipClp,
            receivedClp: payment.receivedClp,
          })
          .run();
        if (payment.items.length > 0) {
          tx.insert(paymentItems)
            .values(payment.items.map((item) => ({ ...item, paymentId })))
            .run();
        }
        return true;
      }),
    );
  }

  async voidPayment(
    checkId: string,
    version: number,
    payment: Pick<Payment, 'id' | 'mode'>,
    reason: string,
  ): Promise<boolean> {
    return Promise.resolve(
      this.#db.transaction((tx) => {
        const split =
          payment.mode === 'equal'
            ? { splitPaidParts: sql`max(${checks.splitPaidParts} - 1, 0)` }
            : {};
        // The version claim also proves the payment was not voided since it was read.
        if (!claimOpenCheck(tx, checkId, version, split)) return false;
        tx.update(payments)
          .set({ voidedAt: new Date(), voidReason: reason })
          .where(and(eq(payments.id, payment.id), isNull(payments.voidedAt)))
          .run();
        return true;
      }),
    );
  }

  async setSplit(checkId: string, version: number, parts: number | null): Promise<boolean> {
    return Promise.resolve(
      this.#db.transaction((tx) =>
        claimOpenCheck(tx, checkId, version, { splitParts: parts, splitPaidParts: 0 }),
      ),
    );
  }

  async close(checkId: string, version: number): Promise<boolean> {
    return Promise.resolve(
      this.#db.transaction((tx) => {
        const now = new Date();
        if (!claimOpenCheck(tx, checkId, version, { status: 'closed', closedAt: now })) {
          return false;
        }
        tx.update(orders)
          .set({ status: 'paid', updatedAt: now })
          .where(and(eq(orders.checkId, checkId), eq(orders.status, 'delivered')))
          .run();
        return true;
      }),
    );
  }

  #read(where: ReturnType<typeof and>, db: CheckReader = this.#db): CheckRecord[] {
    const rows = db
      .select(checkColumns)
      .from(checks)
      .leftJoin(diningTables, eq(checks.tableId, diningTables.id))
      .where(where)
      .orderBy(asc(checks.createdAt))
      .all();
    const paymentsByCheck = this.#paymentsByCheck(
      rows.map((row) => row.id),
      db,
    );
    return rows.map((row) => ({ ...row, payments: paymentsByCheck.get(row.id) ?? [] }));
  }

  #paymentsByCheck(checkIds: string[], db: CheckReader): Map<string, Payment[]> {
    if (checkIds.length === 0) return new Map();
    const rows = db
      .select()
      .from(payments)
      .where(inArray(payments.checkId, checkIds))
      .orderBy(asc(payments.createdAt))
      .all();
    const items = rows.length
      ? db
          .select()
          .from(paymentItems)
          .where(
            inArray(
              paymentItems.paymentId,
              rows.map((row) => row.id),
            ),
          )
          .all()
      : [];

    const grouped = new Map<string, Payment[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.checkId) ?? [];
      bucket.push({
        id: row.id,
        method: row.method,
        mode: row.mode,
        amountClp: row.amountClp,
        tipClp: row.tipClp,
        receivedClp: row.receivedClp,
        changeClp: row.receivedClp === null ? null : row.receivedClp - row.amountClp - row.tipClp,
        items: items
          .filter((item) => item.paymentId === row.id)
          .map(({ orderItemId, quantity, amountClp }) => ({ orderItemId, quantity, amountClp })),
        createdAt: row.createdAt.toISOString(),
        voidedAt: row.voidedAt?.toISOString() ?? null,
        voidReason: row.voidReason,
      });
      grouped.set(row.checkId, bucket);
    }
    return grouped;
  }
}
