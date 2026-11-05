import type { PrintJob, PrintJobKind, PrintJobStatus } from '@bigger/shared';
import { and, asc, desc, eq, inArray, lte, notExists, sql } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client.js';
import { printJobs } from '../../db/schema.js';

type JobRow = typeof printJobs.$inferSelect;

export interface NewPrintJob {
  kind: PrintJobKind;
  orderId: string;
  label: string;
}

export interface PrintJobsRepository {
  /** Adds the next copy of this order's ticket (1 for the original, 2+ for reprints). */
  enqueue: (job: NewPrintJob) => Promise<PrintJob>;
  /** Takes the oldest job that is due and marks it as printing; `null` when nothing is due. */
  claimNext: (now: Date) => Promise<PrintJob | null>;
  markPrinted: (id: string, at: Date) => Promise<void>;
  /** Records a failed attempt; with a date it waits for another try, without one it gives up. */
  markFailed: (id: string, error: string, retryAt: Date | null) => Promise<void>;
  /** When the next waiting job becomes due, if any. */
  nextDueAt: () => Promise<Date | null>;
  /** Jobs left "printing" by a crash go back to the queue. */
  recoverInterrupted: (now: Date) => Promise<number>;
  list: (statuses: readonly PrintJobStatus[] | undefined, limit: number) => Promise<PrintJob[]>;
  hasPrintedCopy: (orderId: string, kind: PrintJobKind) => Promise<boolean>;
  summary: () => Promise<{
    pending: number;
    failed: number;
    lastPrintedAt: Date | null;
    lastError: string | null;
  }>;
}

function toJob(row: JobRow): PrintJob {
  return {
    id: row.id,
    kind: row.kind,
    orderId: row.orderId,
    label: row.label,
    copy: row.copy,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    printedAt: row.printedAt?.toISOString() ?? null,
  };
}

export class DrizzlePrintJobsRepository implements PrintJobsRepository {
  readonly #db: AppDatabase;

  constructor(db: AppDatabase) {
    this.#db = db;
  }

  async enqueue(job: NewPrintJob): Promise<PrintJob> {
    const created = this.#db.transaction((tx) => {
      const last = tx
        .select({ copy: sql<number>`coalesce(max(${printJobs.copy}), 0)` })
        .from(printJobs)
        .where(and(eq(printJobs.orderId, job.orderId), eq(printJobs.kind, job.kind)))
        .get();
      const [row] = tx
        .insert(printJobs)
        .values({ ...job, copy: (last?.copy ?? 0) + 1 })
        .returning()
        .all();
      if (!row) throw new Error('No se pudo encolar el trabajo de impresión');
      return row;
    });
    return Promise.resolve(toJob(created));
  }

  async claimNext(now: Date): Promise<PrintJob | null> {
    const claimed = this.#db.transaction((tx) => {
      const next = tx
        .select()
        .from(printJobs)
        .where(and(eq(printJobs.status, 'pending'), lte(printJobs.nextAttemptAt, now)))
        .orderBy(asc(printJobs.nextAttemptAt), asc(printJobs.createdAt))
        .limit(1)
        .get();
      if (!next) return null;
      tx.update(printJobs).set({ status: 'printing' }).where(eq(printJobs.id, next.id)).run();
      return { ...next, status: 'printing' as const };
    });
    return Promise.resolve(claimed ? toJob(claimed) : null);
  }

  async markPrinted(id: string, at: Date): Promise<void> {
    this.#db
      .update(printJobs)
      .set({
        status: 'printed',
        printedAt: at,
        lastError: null,
        attempts: sql`${printJobs.attempts} + 1`,
      })
      .where(eq(printJobs.id, id))
      .run();
    return Promise.resolve();
  }

  async markFailed(id: string, error: string, retryAt: Date | null): Promise<void> {
    this.#db
      .update(printJobs)
      .set({
        status: retryAt ? 'pending' : 'failed',
        lastError: error,
        attempts: sql`${printJobs.attempts} + 1`,
        ...(retryAt ? { nextAttemptAt: retryAt } : {}),
      })
      .where(eq(printJobs.id, id))
      .run();
    return Promise.resolve();
  }

  async nextDueAt(): Promise<Date | null> {
    const row = this.#db
      .select({ at: printJobs.nextAttemptAt })
      .from(printJobs)
      .where(eq(printJobs.status, 'pending'))
      .orderBy(asc(printJobs.nextAttemptAt))
      .limit(1)
      .get();
    return Promise.resolve(row?.at ?? null);
  }

  async recoverInterrupted(now: Date): Promise<number> {
    const result = this.#db
      .update(printJobs)
      .set({ status: 'pending', nextAttemptAt: now })
      .where(eq(printJobs.status, 'printing'))
      .run();
    return Promise.resolve(result.changes);
  }

  async list(statuses: readonly PrintJobStatus[] | undefined, limit: number): Promise<PrintJob[]> {
    const rows = this.#db
      .select()
      .from(printJobs)
      .where(statuses ? inArray(printJobs.status, [...statuses]) : undefined)
      .orderBy(desc(printJobs.createdAt))
      .limit(limit)
      .all();
    return Promise.resolve(rows.map(toJob));
  }

  async hasPrintedCopy(orderId: string, kind: PrintJobKind): Promise<boolean> {
    const row = this.#db
      .select({ id: printJobs.id })
      .from(printJobs)
      .where(
        and(
          eq(printJobs.orderId, orderId),
          eq(printJobs.kind, kind),
          eq(printJobs.status, 'printed'),
        ),
      )
      .limit(1)
      .get();
    return Promise.resolve(row !== undefined);
  }

  async summary(): Promise<Awaited<ReturnType<PrintJobsRepository['summary']>>> {
    const pending = this.#db
      .select({ total: sql<number>`count(*)` })
      .from(printJobs)
      .where(inArray(printJobs.status, ['pending', 'printing']))
      .get();
    // A failure no longer counts once a later copy of the same ticket printed.
    const printedSibling = this.#db
      .select({ one: sql`1` })
      .from(sql`${printJobs} as printed`)
      .where(
        sql`printed.order_id = ${printJobs.orderId} and printed.kind = ${printJobs.kind} and printed.status = 'printed'`,
      );
    const failed = this.#db
      .select({ total: sql<number>`count(*)` })
      .from(printJobs)
      .where(and(eq(printJobs.status, 'failed'), notExists(printedSibling)))
      .get();
    const lastPrinted = this.#db
      .select({ at: printJobs.printedAt })
      .from(printJobs)
      .where(eq(printJobs.status, 'printed'))
      .orderBy(desc(printJobs.printedAt))
      .limit(1)
      .get();
    const lastFailure = this.#db
      .select({ error: printJobs.lastError })
      .from(printJobs)
      .where(inArray(printJobs.status, ['pending', 'failed']))
      .orderBy(desc(printJobs.updatedAt))
      .limit(1)
      .get();
    return Promise.resolve({
      pending: pending?.total ?? 0,
      failed: failed?.total ?? 0,
      lastPrintedAt: lastPrinted?.at ?? null,
      lastError: lastFailure?.error ?? null,
    });
  }
}
