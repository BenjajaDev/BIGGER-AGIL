import {
  ApiErrorBodySchema,
  apiSuccessSchema,
  MenuProductSchema,
  OrderSchema,
  PrinterStatusSchema,
  PrintJobSchema,
  type Order,
} from '@bigger/shared';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { PathPrinter } from '../src/modules/printing/receipt-printer.js';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let context: TestContext;
let paperPath: string;

afterEach(() => {
  context.connection.close();
});

async function setup(enabled: boolean) {
  paperPath = join(mkdtempSync(join(tmpdir(), 'bigger-paper-')), 'paper.bin');
  context = await createTestContext({
    withDemoOrders: false,
    ...(enabled ? { printing: { printer: new PathPrinter(paperPath) } } : {}),
  });
}

const paper = () => {
  try {
    return readFileSync(paperPath).toString('latin1');
  } catch {
    return '';
  }
};

async function placeOrder(): Promise<Order> {
  const menu = apiSuccessSchema(z.array(MenuProductSchema)).parse(
    (await request(context.app).get('/api/v1/products')).body,
  ).data;
  const tables = (await request(context.app).get('/api/v1/tables')).body as {
    data: { id: string }[];
  };
  const luco = menu.find((product) => product.name === 'Luco');
  const response = await request(context.app)
    .post('/api/v1/orders')
    .send({
      channel: 'dine-in',
      tableId: tables.data[0]?.id,
      customerName: 'Ana',
      items: [{ productId: luco?.id, quantity: 2, note: 'sin sal' }],
    });
  expect(response.status).toBe(201);
  return apiSuccessSchema(OrderSchema).parse(response.body).data;
}

describe('printing turned off', () => {
  it('reports itself as disabled and answers 503 to anything that needs the printer', async () => {
    await setup(false);
    const status = apiSuccessSchema(PrinterStatusSchema).parse(
      (await request(context.app).get('/api/v1/printer')).body,
    ).data;
    expect(status).toMatchObject({ enabled: false, device: null, pending: 0, failed: 0 });

    const test = await request(context.app).post('/api/v1/printer/test');
    expect(test.status).toBe(503);
    expect(ApiErrorBodySchema.parse(test.body).error.code).toBe('SERVICE_UNAVAILABLE');

    const order = await placeOrder();
    expect((await request(context.app).post(`/api/v1/orders/${order.id}/print`)).status).toBe(503);
    expect(paper()).toBe('');
  });
});

describe('printing turned on', () => {
  it('prints the comanda of each new order and lists the job as printed', async () => {
    await setup(true);
    const order = await placeOrder();

    await vi.waitFor(() => {
      expect(paper()).toContain('2 x LUCO');
    });
    expect(paper()).toContain((order.tableLabel ?? '').toUpperCase());
    expect(paper()).toContain('Para: Ana');
    expect(paper()).toContain('NOTA: sin sal');
    expect(paper()).not.toContain('REIMPRESI');

    await vi.waitFor(async () => {
      const jobs = apiSuccessSchema(z.array(PrintJobSchema)).parse(
        (await request(context.app).get('/api/v1/print-jobs').query({ status: 'printed' })).body,
      ).data;
      expect(jobs.map((job) => [job.orderId, job.copy, job.label])).toEqual([
        [order.id, 1, order.tableLabel],
      ]);
    });
    const status = apiSuccessSchema(PrinterStatusSchema).parse(
      (await request(context.app).get('/api/v1/printer')).body,
    ).data;
    expect(status).toMatchObject({ enabled: true, pending: 0, failed: 0, lastError: null });
    expect(status.lastPrintedAt).not.toBeNull();
  });

  it('reprints on demand with the reprint mark and answers 202 while it is queued', async () => {
    await setup(true);
    const order = await placeOrder();
    await vi.waitFor(() => {
      expect(paper()).toContain('2 x LUCO');
    });

    const response = await request(context.app).post(`/api/v1/orders/${order.id}/print`);
    expect(response.status).toBe(202);
    expect(apiSuccessSchema(PrintJobSchema).parse(response.body).data).toMatchObject({
      copy: 2,
      orderId: order.id,
    });

    await vi.waitFor(() => {
      expect(paper()).toContain('REIMPRESI');
    });
  });

  it('prints the test sheet and rejects bad or unknown orders', async () => {
    await setup(true);
    const test = await request(context.app).post('/api/v1/printer/test');
    expect(test.status).toBe(200);
    expect(paper()).toContain('HOJA DE PRUEBA');

    expect((await request(context.app).post('/api/v1/orders/no-es-un-uuid/print')).status).toBe(
      400,
    );
    expect(
      (await request(context.app).post(`/api/v1/orders/${crypto.randomUUID()}/print`)).status,
    ).toBe(404);
    expect(
      (await request(context.app).get('/api/v1/print-jobs').query({ status: 'nope' })).status,
    ).toBe(400);
  });

  it('keeps the order when the printer is unreachable and shows the problem', async () => {
    await setup(true);
    const unreachable = join(tmpdir(), 'bigger-sin-dispositivo', 'lp0');
    context.connection.close();
    context = await createTestContext({
      withDemoOrders: false,
      printing: { printer: new PathPrinter(unreachable) },
    });

    const order = await placeOrder();
    expect(order.status).toBe('new');

    await vi.waitFor(async () => {
      const status = apiSuccessSchema(PrinterStatusSchema).parse(
        (await request(context.app).get('/api/v1/printer')).body,
      ).data;
      expect(status.lastError).toContain('No se encontró la impresora');
    });
  });
});
