import {
  ApiErrorBodySchema,
  apiSuccessSchema,
  CheckSchema,
  MenuProductSchema,
  OrderSchema,
  TableOverviewSchema,
  type Check,
  type Order,
  type RealtimeEvent,
  type TableOverview,
} from '@bigger/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let context: TestContext;
let events: RealtimeEvent[];
let prices: Map<string, string>;

beforeEach(async () => {
  context = await createTestContext({ withDemoOrders: false });
  const products = apiSuccessSchema(z.array(MenuProductSchema)).parse(
    (await request(context.app).get('/api/v1/products')).body,
  ).data;
  prices = new Map(products.map((product) => [product.name, product.id]));
  events = [];
  context.eventHub.subscribe((event) => events.push(event));
});

afterEach(() => {
  context.connection.close();
});

const api = () => request(context.app);

function productId(name: string): string {
  const id = prices.get(name);
  if (!id) throw new Error(`El seed no tiene «${name}»`);
  return id;
}

async function tables(): Promise<TableOverview[]> {
  return apiSuccessSchema(z.array(TableOverviewSchema)).parse(
    (await api().get('/api/v1/tables')).body,
  ).data;
}

async function firstTableId(): Promise<string> {
  const [table] = await tables();
  if (!table) throw new Error('El seed no tiene mesas');
  return table.id;
}

async function order(
  tableId: string | null,
  items: Record<string, number>,
  customerName: string | null = null,
): Promise<Order> {
  const response = await api()
    .post('/api/v1/orders')
    .send({
      channel: tableId === null ? 'takeaway' : 'dine-in',
      tableId,
      customerName: customerName ?? (tableId === null ? 'Ana' : null),
      items: Object.entries(items).map(([name, quantity]) => ({
        productId: productId(name),
        quantity,
      })),
    });
  expect(response.status).toBe(201);
  return apiSuccessSchema(OrderSchema).parse(response.body).data;
}

async function tableCheck(tableId: string): Promise<Check> {
  const response = await api().get(`/api/v1/tables/${tableId}/check`);
  expect(response.status).toBe(200);
  return apiSuccessSchema(CheckSchema).parse(response.body).data;
}

async function pay(checkId: string, body: Record<string, unknown>) {
  return api().post(`/api/v1/checks/${checkId}/payments`).send(body);
}

const checkOf = (response: request.Response) =>
  apiSuccessSchema(CheckSchema).parse(response.body).data;
const errorOf = (response: request.Response) => ApiErrorBodySchema.parse(response.body).error;

async function advance(orderId: string, ...statuses: string[]) {
  for (const status of statuses) {
    const response = await api().patch(`/api/v1/orders/${orderId}/status`).send({ status });
    expect(response.status).toBe(200);
  }
}

describe('a table shared by several people', () => {
  it('adds the order of someone who arrives later to the same open check', async () => {
    const tableId = await firstTableId();
    const juan = await order(tableId, { Luco: 1 }, 'Juan');
    const ana = await order(tableId, { 'Pie limón': 2 }, 'Ana');

    expect(ana.checkId).toBe(juan.checkId);
    const check = await tableCheck(tableId);
    expect(check.orders.map((candidate) => candidate.customerName)).toEqual(['Juan', 'Ana']);
    expect(check).toMatchObject({ totalClp: 3990 + 2600, paidClp: 0, balanceClp: 6590 });

    const [overview] = await tables();
    expect(overview).toMatchObject({ checkId: juan.checkId, status: 'occupied', balanceClp: 6590 });
  });

  it('gives takeaway orders their own check', async () => {
    const first = await order(null, { Luco: 1 });
    const second = await order(null, { Luco: 1 });
    expect(first.checkId).not.toBe(second.checkId);
    const response = await api().get(`/api/v1/checks/${first.checkId}`);
    expect(checkOf(response)).toMatchObject({ tableId: null, totalClp: 3990 });
  });

  it('answers 404 for a free table', async () => {
    const response = await api().get(`/api/v1/tables/${await firstTableId()}/check`);
    expect(response.status).toBe(404);
  });
});

describe('POST /api/v1/checks/:checkId/payments', () => {
  it('lets one person pay only their item and never charges it twice', async () => {
    const tableId = await firstTableId();
    const placed = await order(tableId, { Luco: 1, 'Pie limón': 2 });
    const pie = placed.items.find((item) => item.productName === 'Pie limón');
    if (!pie) throw new Error('Falta el pie en el pedido');

    const paid = await pay(placed.checkId, {
      mode: 'items',
      method: 'debit',
      items: [{ orderItemId: pie.id, quantity: 1 }],
      expectedAmountClp: 1300,
      tipClp: 130,
    });
    expect(paid.status).toBe(201);
    const check = checkOf(paid);
    expect(check).toMatchObject({ paidClp: 1300, tipClp: 130, balanceClp: 3990 + 1300 });
    expect(check.lines.find((line) => line.orderItemId === pie.id)?.paidQuantity).toBe(1);

    await pay(placed.checkId, {
      mode: 'items',
      method: 'cash',
      items: [{ orderItemId: pie.id, quantity: 1 }],
      expectedAmountClp: 1300,
      receivedClp: 2000,
    });
    const again = await pay(placed.checkId, {
      mode: 'items',
      method: 'debit',
      items: [{ orderItemId: pie.id, quantity: 1 }],
      expectedAmountClp: 1300,
    });
    expect(again.status).toBe(400);
    expect(errorOf(again).issues).toEqual([
      { path: 'items.0.quantity', message: '«Pie limón» ya está pagado' },
    ]);
  });

  it('splits in equal parts and recalculates the last part when someone orders more', async () => {
    const tableId = await firstTableId();
    const placed = await order(tableId, { Luco: 2 });

    const split = checkOf(
      await api().put(`/api/v1/checks/${placed.checkId}/split`).send({ parts: 2 }),
    );
    expect(split).toMatchObject({ splitParts: 2, remainingParts: 2, nextPartClp: 3990 });

    const half = checkOf(
      await pay(placed.checkId, { mode: 'equal', method: 'junaeb', expectedAmountClp: 3990 }),
    );
    expect(half).toMatchObject({ balanceClp: 3990, remainingParts: 1, nextPartClp: 3990 });

    await order(tableId, { 'Pie limón': 1 });
    expect(await tableCheck(tableId)).toMatchObject({
      remainingParts: 1,
      nextPartClp: 3990 + 1300,
    });
  });

  it('charges cash with tip and change, and frees the table once everything is delivered', async () => {
    const tableId = await firstTableId();
    const placed = await order(tableId, { Luco: 1 });

    const paid = checkOf(
      await pay(placed.checkId, {
        mode: 'full',
        method: 'cash',
        expectedAmountClp: 3990,
        tipClp: 400,
        receivedClp: 5000,
      }),
    );
    // Paid before the kitchen finished: the table stays occupied until it is delivered.
    expect(paid).toMatchObject({ status: 'open', balanceClp: 0 });
    expect(paid.payments[0]).toMatchObject({ amountClp: 3990, tipClp: 400, changeClp: 610 });
    expect((await tables())[0]).toMatchObject({ status: 'occupied', balanceClp: 0 });

    events.length = 0;
    await advance(placed.id, 'preparing', 'ready', 'delivered');

    const closed = checkOf(await api().get(`/api/v1/checks/${placed.checkId}`));
    expect(closed.status).toBe('closed');
    expect(closed.orders.map((candidate) => candidate.status)).toEqual(['paid']);
    expect((await tables())[0]).toMatchObject({ status: 'free', checkId: null });
    expect(events.at(-1)).toMatchObject({ type: 'check.updated', payload: { status: 'closed' } });
    expect(
      events.some((event) => event.type === 'order.updated' && event.payload.status === 'paid'),
    ).toBe(true);

    // The next customers at that table start a new check.
    const next = await order(tableId, { Luco: 1 });
    expect(next.checkId).not.toBe(placed.checkId);
  });

  it('closes a delivered, awaiting-payment table as soon as it is paid in full', async () => {
    const tableId = await firstTableId();
    const placed = await order(tableId, { Luco: 1 });
    await advance(placed.id, 'preparing', 'ready', 'delivered');
    expect((await tables())[0]?.status).toBe('awaiting-payment');

    const closed = checkOf(
      await pay(placed.checkId, { mode: 'full', method: 'debit', expectedAmountClp: 3990 }),
    );
    expect(closed.status).toBe('closed');
    expect((await tables())[0]?.status).toBe('free');
  });

  it('rejects a payment whose amount changed since the cashier looked at it', async () => {
    const tableId = await firstTableId();
    const placed = await order(tableId, { Luco: 1 });
    await order(tableId, { 'Pie limón': 1 });

    const response = await pay(placed.checkId, {
      mode: 'full',
      method: 'debit',
      expectedAmountClp: 3990,
    });
    expect(response.status).toBe(409);
    expect(errorOf(response).message).toBe(
      'El monto cambió: ahora es $5.290. Revisa la cuenta antes de cobrar',
    );
  });

  it('validates cash received, JUNAEB tips and payments on settled checks', async () => {
    const placed = await order(await firstTableId(), { Luco: 1 });

    const short = await pay(placed.checkId, {
      mode: 'full',
      method: 'cash',
      expectedAmountClp: 3990,
      tipClp: 400,
      receivedClp: 4000,
    });
    expect(errorOf(short).issues).toEqual([
      { path: 'receivedClp', message: 'Recibido menor al total a pagar ($4.390)' },
    ]);

    const junaebTip = await pay(placed.checkId, {
      mode: 'full',
      method: 'junaeb',
      expectedAmountClp: 3990,
      tipClp: 400,
    });
    expect(errorOf(junaebTip).issues?.[0]?.path).toBe('tipClp');

    await pay(placed.checkId, { mode: 'full', method: 'junaeb', expectedAmountClp: 3990 });
    const nothingOwed = await pay(placed.checkId, {
      mode: 'full',
      method: 'debit',
      expectedAmountClp: 0,
    });
    expect(nothingOwed.status).toBe(409);
    expect(errorOf(nothingOwed).message).toBe('La cuenta no tiene saldo pendiente');
  });

  it('needs a split before charging an equal part', async () => {
    const placed = await order(await firstTableId(), { Luco: 1 });
    const response = await pay(placed.checkId, {
      mode: 'equal',
      method: 'debit',
      expectedAmountClp: 3990,
    });
    expect(errorOf(response).issues).toEqual([
      { path: 'mode', message: 'Primero divide la cuenta en partes iguales' },
    ]);
  });
});

describe('voiding payments and cancelling paid orders', () => {
  it('voids a payment with a reason, restoring the balance, only once', async () => {
    const placed = await order(await firstTableId(), { Luco: 1 });
    const paid = checkOf(
      await pay(placed.checkId, { mode: 'full', method: 'debit', expectedAmountClp: 3990 }),
    );
    const paymentId = paid.payments[0]?.id ?? '';

    const voided = await api()
      .post(`/api/v1/payments/${paymentId}/void`)
      .send({ reason: 'Tarjeta equivocada' });
    expect(voided.status).toBe(200);
    expect(checkOf(voided)).toMatchObject({ paidClp: 0, balanceClp: 3990 });
    expect(checkOf(voided).payments[0]).toMatchObject({ voidReason: 'Tarjeta equivocada' });

    const twice = await api()
      .post(`/api/v1/payments/${paymentId}/void`)
      .send({ reason: 'Otra vez' });
    expect(twice.status).toBe(409);
  });

  it('does not cancel an order with paid products until the payment is voided', async () => {
    const placed = await order(await firstTableId(), { Luco: 1 });
    const [line] = placed.items;
    const paid = checkOf(
      await pay(placed.checkId, {
        mode: 'items',
        method: 'debit',
        items: [{ orderItemId: line?.id, quantity: 1 }],
        expectedAmountClp: 3990,
      }),
    );

    const blocked = await api()
      .patch(`/api/v1/orders/${placed.id}/status`)
      .send({ status: 'cancelled' });
    expect(blocked.status).toBe(409);

    await api()
      .post(`/api/v1/payments/${paid.payments[0]?.id ?? ''}/void`)
      .send({ reason: 'Se equivocó de pedido' });
    const cancelled = await api()
      .patch(`/api/v1/orders/${placed.id}/status`)
      .send({ status: 'cancelled' });
    expect(cancelled.status).toBe(200);
    // Nothing left to bill: the check closes and the table is free again.
    expect((await tables())[0]).toMatchObject({ status: 'free', checkId: null });
  });
});
