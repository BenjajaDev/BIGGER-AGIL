import type { Order } from '@bigger/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../core/logger.js';
import { openDatabase, runMigrations, type DatabaseConnection } from '../../db/client.js';
import { seedDatabase } from '../../db/seed/seed.js';
import { diningTables, products } from '../../db/schema.js';
import { EventHub } from '../../realtime/event-hub.js';
import { DrizzleOrdersRepository } from '../orders/orders.repository.js';
import { DrizzlePrintJobsRepository } from './print-jobs.repository.js';
import { PrintService, type PrintingOptions } from './print.service.js';
import { PrinterError, type ReceiptPrinter } from './receipt-printer.js';

const OPTIONS: PrintingOptions = {
  codepage: 'cp858',
  columns: 32,
  feedLines: 3,
  cut: false,
  timeZone: 'America/Santiago',
};

class FakePrinter implements ReceiptPrinter {
  readonly description = 'FAKE';
  readonly printed: Buffer[] = [];
  /** Each entry decides the next call: undefined prints, an Error fails, a promise blocks. */
  readonly script: (Error | Promise<void> | undefined)[] = [];

  async print(data: Uint8Array): Promise<void> {
    const step = this.script.shift();
    if (step instanceof Error) throw step;
    if (step) await step;
    this.printed.push(Buffer.from(data));
  }
}

let connection: DatabaseConnection;
let orders: DrizzleOrdersRepository;
let jobs: DrizzlePrintJobsRepository;
let printer: FakePrinter;
let tableIds: string[];
let productId: string;

beforeEach(() => {
  connection = openDatabase(':memory:');
  runMigrations(connection.db);
  seedDatabase(connection.db, { withDemoOrders: false });
  orders = new DrizzleOrdersRepository(connection.db);
  jobs = new DrizzlePrintJobsRepository(connection.db);
  printer = new FakePrinter();
  tableIds = connection.db
    .select({ id: diningTables.id })
    .from(diningTables)
    .all()
    .map((row) => row.id);
  productId = connection.db.select({ id: products.id }).from(products).limit(1).get()?.id ?? '';
});

afterEach(() => {
  vi.useRealTimers();
  connection.close();
});

function service(overrides: { printer?: ReceiptPrinter | null; retryDelaysMs?: number[] } = {}) {
  return new PrintService({
    jobs,
    printer: overrides.printer === undefined ? printer : overrides.printer,
    orders,
    options: OPTIONS,
    logger: createLogger('silent'),
    retryDelaysMs: overrides.retryDelaysMs ?? [],
  });
}

async function newOrder(tableIndex = 0, customerName: string | null = null): Promise<Order> {
  return orders.create({
    channel: 'dine-in',
    tableId: tableIds[tableIndex] ?? null,
    customerName,
    pickupAt: null,
    totalClp: 3990,
    items: [
      {
        productId,
        productName: 'Luco',
        unitPriceClp: 3990,
        quantity: 2,
        quickNotes: [],
        note: 'sin sal',
        options: [],
      },
    ],
  });
}

const statusOf = async (id: string) =>
  (await jobs.list(undefined, 50)).find((job) => job.id === id)?.status;
const text = (buffer: Buffer | undefined) => buffer?.toString('latin1') ?? '';

describe('PrintService', () => {
  it('prints a queued comanda once, with the table and the products', async () => {
    const queue = service();
    const order = await newOrder();
    const job = await queue.enqueueKitchenTicket(order);

    await vi.waitFor(async () => {
      expect(await statusOf(job.id)).toBe('printed');
    });
    expect(printer.printed).toHaveLength(1);
    expect(text(printer.printed[0])).toContain((order.tableLabel ?? '').toUpperCase());
    expect(text(printer.printed[0])).toContain('2 x LUCO');
    expect(text(printer.printed[0])).toContain('NOTA: sin sal');
    expect(await queue.status()).toMatchObject({
      enabled: true,
      pending: 0,
      failed: 0,
      device: 'FAKE',
    });
  });

  it('prints every order announced on the event hub', async () => {
    const hub = new EventHub();
    const queue = service();
    await queue.start(hub);
    const order = await newOrder();

    hub.publish({ type: 'order.created', payload: order });

    await vi.waitFor(() => {
      expect(printer.printed).toHaveLength(1);
    });
  });

  it('retries a failed attempt after its delay and then prints', async () => {
    vi.useFakeTimers();
    printer.script.push(new PrinterError('La impresora no responde.'));
    const queue = service({ retryDelaysMs: [1_000] });
    const job = await queue.enqueueKitchenTicket(await newOrder());

    await vi.advanceTimersByTimeAsync(10);
    expect(await statusOf(job.id)).toBe('pending');
    expect((await queue.status()).lastError).toBe('La impresora no responde.');

    await vi.advanceTimersByTimeAsync(1_000);
    expect(await statusOf(job.id)).toBe('printed');
    expect(printer.printed).toHaveLength(1);
    expect((await queue.status()).lastError).toBeNull();
  });

  it('leaves the job failed when the retries run out, and a reprint clears the alarm', async () => {
    printer.script.push(new PrinterError('Sin papel.'));
    const queue = service({ retryDelaysMs: [] });
    const order = await newOrder();
    const failed = await queue.enqueueKitchenTicket(order);

    await vi.waitFor(async () => {
      expect(await statusOf(failed.id)).toBe('failed');
    });
    expect(await queue.status()).toMatchObject({ failed: 1, lastError: 'Sin papel.' });

    await queue.reprintOrder(order.id);
    await vi.waitFor(() => {
      expect(printer.printed).toHaveLength(1);
    });
    expect((await queue.status()).failed).toBe(0);
    // Nothing had come out before, so it is not announced as a reprint.
    expect(text(printer.printed[0])).not.toContain('REIMPRESI');
  });

  it('marks a reprint only when an earlier copy was really printed', async () => {
    const queue = service();
    const order = await newOrder();
    await queue.enqueueKitchenTicket(order);
    await vi.waitFor(() => {
      expect(printer.printed).toHaveLength(1);
    });

    await queue.reprintOrder(order.id);
    await vi.waitFor(() => {
      expect(printer.printed).toHaveLength(2);
    });
    expect(printer.printed[1]?.includes(Buffer.from('REIMPRESI'))).toBe(true);
    expect(printer.printed[0]?.includes(Buffer.from('REIMPRESI'))).toBe(false);
  });

  it('keeps printing the next order when one fails for good', async () => {
    printer.script.push(new PrinterError('Atasco de papel.'));
    const queue = service({ retryDelaysMs: [] });
    const first = await queue.enqueueKitchenTicket(await newOrder(0));
    const second = await queue.enqueueKitchenTicket(await newOrder(1));

    await vi.waitFor(async () => {
      expect(await statusOf(second.id)).toBe('printed');
    });
    expect(await statusOf(first.id)).toBe('failed');
  });

  it('does not miss an order that arrives while the queue is emptying', async () => {
    let release: () => void = () => undefined;
    printer.script.push(new Promise<void>((resolve) => (release = resolve)));
    const queue = service();
    await queue.enqueueKitchenTicket(await newOrder(0));
    await vi.waitFor(() => {
      expect(printer.script).toHaveLength(0); // the first print is in flight
    });

    const late = await queue.enqueueKitchenTicket(await newOrder(1));
    release();

    await vi.waitFor(async () => {
      expect(await statusOf(late.id)).toBe('printed');
    });
    expect(printer.printed).toHaveLength(2);
  });

  it('resumes a job that a restart left half done', async () => {
    const order = await newOrder();
    const stuck = await jobs.enqueue({ kind: 'kitchen', orderId: order.id, label: 'Mesa 1' });
    await jobs.claimNext(new Date()); // "printing" when the power went out

    const queue = service();
    await queue.start(new EventHub());

    await vi.waitFor(async () => {
      expect(await statusOf(stuck.id)).toBe('printed');
    });
  });

  it('answers 503 instead of printing when the printer is off or fails', async () => {
    await expect(service({ printer: null }).printTest()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
    await expect(
      service({ printer: null }).reprintOrder(crypto.randomUUID()),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });

    printer.script.push(new PrinterError('No se encontró la impresora en «COM5».'));
    await expect(service().printTest()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'No se encontró la impresora en «COM5».',
    });
    await expect(service().printTest()).resolves.toHaveProperty('printedAt');
  });

  it('refuses to reprint an order that does not exist', async () => {
    await expect(service().reprintOrder(crypto.randomUUID())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('reports itself as disabled and queues nothing when there is no printer', async () => {
    const queue = service({ printer: null });
    await queue.start(new EventHub());
    expect(await queue.status()).toMatchObject({ enabled: false, device: null, pending: 0 });
  });
});
