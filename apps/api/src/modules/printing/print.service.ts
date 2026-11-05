import {
  formatKitchenTicket,
  formatTestTicket,
  orderTitle,
  type Order,
  type PrintJob,
  type PrinterStatus,
  type PrintJobFilter,
  type PrinterTestResult,
} from '@bigger/shared';
import { AppError } from '../../core/errors/app-error.js';
import type { Logger } from '../../core/logger.js';
import type { RealtimeEvent } from '@bigger/shared';
import type { OrdersRepository } from '../orders/orders.repository.js';
import { encodeTicket, type PrinterCodepage } from './escpos-encoder.js';
import type { PrintJobsRepository } from './print-jobs.repository.js';
import { PrinterError, type ReceiptPrinter } from './receipt-printer.js';

export interface PrintingOptions {
  codepage: PrinterCodepage;
  columns: number;
  feedLines: number;
  cut: boolean;
  /** The shop's time zone, for the clock time printed on each comanda. */
  timeZone: string;
}

/** Waits before each retry; once they run out the job is left as failed. */
const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [2_000, 10_000, 30_000];
const JOB_LIST_LIMIT = 50;
const DISABLED_MESSAGE =
  'La impresora no está activada. Defínela con PRINTER_ENABLED y PRINTER_PATH.';

export interface PrintServiceDependencies {
  jobs: PrintJobsRepository;
  /** `null` while printing is turned off. */
  printer: ReceiptPrinter | null;
  orders: Pick<OrdersRepository, 'findById' | 'list'>;
  options: PrintingOptions;
  logger: Logger;
  now?: () => Date;
  retryDelaysMs?: readonly number[];
}

export interface OrderEvents {
  subscribe: (listener: (event: RealtimeEvent) => void) => () => void;
}

/**
 * Prints each new order's comanda on the thermal printer. Jobs live in SQLite and are printed
 * one at a time (the printer is a single device); a failure never touches the order itself.
 */
export class PrintService {
  readonly #jobs: PrintJobsRepository;
  readonly #printer: ReceiptPrinter | null;
  readonly #orders: Pick<OrdersRepository, 'findById' | 'list'>;
  readonly #options: PrintingOptions;
  readonly #logger: Logger;
  readonly #now: () => Date;
  readonly #retryDelays: readonly number[];
  #draining = false;
  /** A job arrived while the queue was emptying: go around once more so it is not missed. */
  #again = false;
  #timer: NodeJS.Timeout | undefined;
  /** Test sheets and queued jobs share the device: they wait for each other here. */
  #device: Promise<unknown> = Promise.resolve();

  constructor({
    jobs,
    printer,
    orders,
    options,
    logger,
    now = () => new Date(),
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  }: PrintServiceDependencies) {
    this.#jobs = jobs;
    this.#printer = printer;
    this.#orders = orders;
    this.#options = options;
    this.#logger = logger;
    this.#now = now;
    this.#retryDelays = retryDelaysMs;
  }

  /** Resumes what a restart interrupted and prints every order created from now on. */
  async start(events: OrderEvents): Promise<void> {
    if (!this.#printer) return;
    await this.#jobs.recoverInterrupted(this.#now());
    events.subscribe((event) => {
      if (event.type !== 'order.created') return;
      this.enqueueKitchenTicket(event.payload).catch((error: unknown) => {
        this.#logger.error(
          { err: error, orderId: event.payload.id },
          'No se pudo encolar la comanda',
        );
      });
    });
    this.#kick();
  }

  stop(): void {
    clearTimeout(this.#timer);
  }

  async enqueueKitchenTicket(
    order: Pick<Order, 'id' | 'channel' | 'tableLabel' | 'customerName'>,
  ): Promise<PrintJob> {
    const job = await this.#jobs.enqueue({
      kind: 'kitchen',
      orderId: order.id,
      label: orderTitle(order),
    });
    this.#kick();
    return job;
  }

  /** Prints the comanda again (it says «REIMPRESIÓN» if an earlier copy already came out). */
  async reprintOrder(orderId: string): Promise<PrintJob> {
    if (!this.#printer) throw new AppError('SERVICE_UNAVAILABLE', DISABLED_MESSAGE);
    const order = await this.#orders.findById(orderId);
    if (!order) throw AppError.notFound('Pedido');
    return this.enqueueKitchenTicket(order);
  }

  async printTest(): Promise<PrinterTestResult> {
    const printer = this.#requirePrinter();
    const data = encodeTicket(formatTestTicket({ columns: this.#options.columns }), this.#options);
    try {
      await this.#onDevice(() => printer.print(data));
    } catch (error) {
      throw new AppError('SERVICE_UNAVAILABLE', describeFailure(error));
    }
    return { printedAt: this.#now().toISOString() };
  }

  async status(): Promise<PrinterStatus> {
    const summary = await this.#jobs.summary();
    return {
      enabled: this.#printer !== null,
      device: this.#printer?.description ?? null,
      codepage: this.#options.codepage,
      columns: this.#options.columns,
      pending: summary.pending,
      failed: summary.failed,
      lastPrintedAt: summary.lastPrintedAt?.toISOString() ?? null,
      lastError: summary.lastError,
    };
  }

  listJobs(filter: PrintJobFilter): Promise<PrintJob[]> {
    return this.#jobs.list(filter.status, JOB_LIST_LIMIT);
  }

  #requirePrinter(): ReceiptPrinter {
    if (!this.#printer) throw new AppError('SERVICE_UNAVAILABLE', DISABLED_MESSAGE);
    return this.#printer;
  }

  #onDevice<T>(task: () => Promise<T>): Promise<T> {
    const run = this.#device.then(task, task);
    this.#device = run.catch(() => undefined);
    return run;
  }

  #kick(): void {
    if (!this.#printer) return;
    if (this.#draining) {
      this.#again = true;
      return;
    }
    this.#draining = true;
    void this.#drainUntilIdle().catch((error: unknown) => {
      this.#logger.error({ err: error }, 'Falló la cola de impresión');
    });
  }

  /**
   * `#draining` goes back to false in the same tick in which the loop decides to stop: a job
   * enqueued at any other moment either sets `#again` (we loop) or finds the queue idle (it starts).
   */
  async #drainUntilIdle(): Promise<void> {
    try {
      do {
        this.#again = false;
        await this.#drain();
      } while (this.#hasNewWork());
    } finally {
      this.#draining = false;
    }
  }

  /** Read through a method: the flag changes while `#drain` awaits, which the linter cannot see. */
  #hasNewWork(): boolean {
    return this.#again;
  }

  async #drain(): Promise<void> {
    clearTimeout(this.#timer);
    for (
      let job = await this.#jobs.claimNext(this.#now());
      job;
      job = await this.#jobs.claimNext(this.#now())
    ) {
      await this.#attempt(job);
    }
    const due = await this.#jobs.nextDueAt();
    if (due) {
      const wait = Math.max(due.getTime() - this.#now().getTime(), 0);
      this.#timer = setTimeout(() => {
        this.#kick();
      }, wait);
      this.#timer.unref();
    }
  }

  async #attempt(job: PrintJob): Promise<void> {
    const printer = this.#requirePrinter();
    try {
      const data = await this.#render(job);
      await this.#onDevice(() => printer.print(data));
      await this.#jobs.markPrinted(job.id, this.#now());
    } catch (error) {
      const message = describeFailure(error);
      const delay = error instanceof LostOrder ? undefined : this.#retryDelays[job.attempts];
      const retryAt = delay === undefined ? null : new Date(this.#now().getTime() + delay);
      await this.#jobs.markFailed(job.id, message, retryAt);
      this.#logger.warn(
        { jobId: job.id, attempt: job.attempts + 1, willRetry: retryAt !== null },
        message,
      );
    }
  }

  async #render(job: PrintJob): Promise<Buffer> {
    const order = await this.#orders.findById(job.orderId);
    if (!order) throw new LostOrder();
    const sameBill = await this.#orders.list({ checkIds: [order.checkId] });
    const position = sameBill.findIndex((candidate) => candidate.id === order.id);
    const reprint = job.copy > 1 && (await this.#jobs.hasPrintedCopy(job.orderId, job.kind));
    const lines = formatKitchenTicket(
      { order, sequenceInCheck: position + 1, reprint, timeZone: this.#options.timeZone },
      { columns: this.#options.columns },
    );
    return encodeTicket(lines, this.#options);
  }
}

class LostOrder extends Error {
  constructor() {
    super('El pedido ya no existe.');
  }
}

function describeFailure(error: unknown): string {
  if (error instanceof PrinterError || error instanceof LostOrder) return error.message;
  return 'No se pudo imprimir la comanda.';
}
