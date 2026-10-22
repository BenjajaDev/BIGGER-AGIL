import {
  ApiErrorBodySchema,
  apiSuccessSchema,
  OrderSchema,
  type Order,
  type OrderStatus,
  type RealtimeEvent,
} from '@bigger/shared';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { diningTables, orderItemOptions, orderItems, orders, products } from '../src/db/schema.js';
import { DrizzleOrdersRepository } from '../src/modules/orders/orders.repository.js';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let context: TestContext;
let repository: DrizzleOrdersRepository;
let order: Order;
let events: RealtimeEvent[];

beforeEach(async () => {
  // The helper migrates and seeds only its new SQLite :memory: connection.
  context = await createTestContext({ withDemoOrders: false });
  repository = new DrizzleOrdersRepository(context.connection.db);
  const product = context.connection.db.select().from(products).get();
  const table = context.connection.db.select().from(diningTables).get();
  if (!product || !table) throw new Error('Missing isolated test catalog or table');

  order = await repository.create({
    channel: 'dine-in',
    tableId: table.id,
    customerName: null,
    pickupAt: null,
    totalClp: 6000,
    items: [
      {
        productId: product.id,
        productName: 'Capuchino vendido',
        unitPriceClp: 2500,
        quantity: 2,
        quickNotes: ['no-sugar'],
        note: 'Bien caliente',
        options: [
          {
            kind: 'modifier',
            label: 'Tipo de leche',
            name: 'Almendra',
            priceDeltaClp: 500,
            referenceId: randomUUID(),
          },
        ],
      },
    ],
  });
  // A fixed older timestamp makes the updatedAt assertion independent of clock resolution.
  context.connection.db
    .update(orders)
    .set({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    .where(eq(orders.id, order.id))
    .run();
  const stored = await repository.findById(order.id);
  if (!stored) throw new Error('Missing isolated test order');
  order = stored;
  events = [];
  context.eventHub.subscribe((event) => events.push(event));
});

afterEach(() => {
  vi.restoreAllMocks();
  context.connection.close();
});

function orderRows() {
  const db = context.connection.db;
  return {
    order: db.select().from(orders).where(eq(orders.id, order.id)).get(),
    items: db.select().from(orderItems).all(),
    options: db.select().from(orderItemOptions).all(),
  };
}

describe('PATCH /api/v1/orders/:orderId/status', () => {
  it.each([
    ['new', 'preparing'],
    ['new', 'cancelled'],
    ['preparing', 'ready'],
    ['preparing', 'cancelled'],
    ['ready', 'delivered'],
    ['delivered', 'paid'],
  ] as const)(
    'persists %s → %s, preserves the order and publishes after saving',
    async (from, to) => {
      context.connection.db
        .update(orders)
        .set({ status: from, updatedAt: new Date(order.updatedAt) })
        .where(eq(orders.id, order.id))
        .run();
      const before = orderRows();
      let statusAtPublication: OrderStatus | undefined;
      context.eventHub.subscribe((event) => {
        if (event.type === 'order.updated') statusAtPublication = orderRows().order?.status;
      });

      const response = await request(context.app)
        .patch(`/api/v1/orders/${order.id}/status`)
        .send({ status: to });

      expect(response.status).toBe(200);
      const updated = apiSuccessSchema(OrderSchema).parse(response.body).data;
      expect(updated).toEqual({ ...order, status: to, updatedAt: updated.updatedAt });
      expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(order.updatedAt));
      const after = orderRows();
      expect(after).toEqual({
        ...before,
        order: { ...before.order, status: to, updatedAt: new Date(updated.updatedAt) },
      });
      expect(await repository.findById(order.id)).toEqual(updated);
      const listResponse = await request(context.app).get('/api/v1/orders').query({ status: to });
      expect(apiSuccessSchema(z.array(OrderSchema)).parse(listResponse.body).data).toEqual([
        updated,
      ]);
      expect(events).toEqual([{ type: 'order.updated', payload: updated }]);
      expect(statusAtPublication).toBe(to);
    },
  );

  it.each([
    ['new', 'new'],
    ['new', 'ready'],
    ['preparing', 'new'],
    ['ready', 'cancelled'],
    ['delivered', 'preparing'],
    ['paid', 'new'],
    ['cancelled', 'new'],
  ] as const)('rejects %s → %s without changing SQLite or publishing', async (from, to) => {
    context.connection.db.update(orders).set({ status: from }).where(eq(orders.id, order.id)).run();
    const before = orderRows();

    const response = await request(context.app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .send({ status: to });

    expect(response.status).toBe(409);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('INVALID_STATE_TRANSITION');
    expect(orderRows()).toEqual(before);
    expect(events).toEqual([]);
  });

  it.each([{}, { status: 'unknown' }, { status: null }, { status: 1 }, null])(
    'rejects an invalid body %j without writing or publishing',
    async (body) => {
      const before = orderRows();
      const response = await request(context.app)
        .patch(`/api/v1/orders/${order.id}/status`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(body));

      expect(response.status).toBe(400);
      expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
      expect(orderRows()).toEqual(before);
      expect(events).toEqual([]);
    },
  );

  it('validates the path UUID', async () => {
    const before = orderRows();
    const response = await request(context.app)
      .patch('/api/v1/orders/invalid/status')
      .send({ status: 'preparing' });

    expect(response.status).toBe(400);
    const error = ApiErrorBodySchema.parse(response.body).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.issues?.[0]?.path).toBe('orderId');
    expect(orderRows()).toEqual(before);
    expect(events).toEqual([]);
  });

  it('returns NOT_FOUND for a valid UUID without a matching order', async () => {
    const before = orderRows();
    const response = await request(context.app)
      .patch(`/api/v1/orders/${randomUUID()}/status`)
      .send({ status: 'preparing' });

    expect(response.status).toBe(404);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND');
    expect(orderRows()).toEqual(before);
    expect(events).toEqual([]);
  });

  it('returns CONFLICT when two requests read the same state, with only one write and event', async () => {
    const originalFind = DrizzleOrdersRepository.prototype.findById.bind(repository);
    let reads = 0;
    let releaseReads!: () => void;
    const bothRead = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    // Force both requests to read "new" before either may write, without timing assumptions.
    vi.spyOn(DrizzleOrdersRepository.prototype, 'findById').mockImplementation(
      async (id: string) => {
        const snapshot = await originalFind(id);
        reads += 1;
        if (reads === 2) releaseReads();
        await bothRead;
        return snapshot;
      },
    );

    const responses = await Promise.all([
      request(context.app).patch(`/api/v1/orders/${order.id}/status`).send({ status: 'preparing' }),
      request(context.app).patch(`/api/v1/orders/${order.id}/status`).send({ status: 'cancelled' }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const success = responses.find((response) => response.status === 200);
    const conflict = responses.find((response) => response.status === 409);
    if (!success || !conflict) throw new Error('Expected a success and a conflict');
    const updated = apiSuccessSchema(OrderSchema).parse(success.body).data;
    expect(ApiErrorBodySchema.parse(conflict.body).error.code).toBe('CONFLICT');
    expect(orderRows().order?.status).toBe(updated.status);
    expect(events).toEqual([{ type: 'order.updated', payload: updated }]);
  });

  it('returns a safe 500 and publishes nothing if SQLite rejects the write', async () => {
    const before = orderRows();
    context.connection.db.run(sql`
      CREATE TRIGGER reject_status_update BEFORE UPDATE OF status ON orders
      BEGIN SELECT RAISE(ABORT, 'isolated test write failure'); END
    `);

    const response = await request(context.app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .send({ status: 'preparing' });

    expect(response.status).toBe(500);
    expect(ApiErrorBodySchema.parse(response.body).error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado',
    });
    expect(orderRows()).toEqual(before);
    expect(events).toEqual([]);
  });
});

describe('DrizzleOrdersRepository conditional status updates', () => {
  it('allows only one competing write against the same expected state', async () => {
    const [first, second] = await Promise.all([
      repository.updateStatus(order.id, 'new', 'preparing'),
      repository.updateStatus(order.id, 'new', 'cancelled'),
    ]);

    expect(first?.status).toBe('preparing');
    expect(second).toBeNull();
    expect(await repository.findById(order.id)).toEqual(first);
  });

  it('returns each write snapshot even if a later write finishes before it is awaited', async () => {
    const [first, second] = await Promise.all([
      repository.updateStatus(order.id, 'new', 'preparing'),
      repository.updateStatus(order.id, 'preparing', 'ready'),
    ]);

    expect(first?.status).toBe('preparing');
    expect(second?.status).toBe('ready');
    expect(await repository.findById(order.id)).toEqual(second);
  });

  it('returns null for an unknown order without changing other rows', async () => {
    const before = orderRows();
    const missingId = randomUUID();

    expect(await repository.findById(missingId)).toBeNull();
    expect(await repository.updateStatus(missingId, 'new', 'preparing')).toBeNull();
    expect(orderRows()).toEqual(before);
  });
});
