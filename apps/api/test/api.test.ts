import {
  ApiErrorBodySchema,
  apiSuccessSchema,
  CategorySchema,
  MenuSchema,
  OrderSchema,
  ProductSchema,
  TableOverviewSchema,
} from '@bigger/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let context: TestContext;

beforeEach(() => {
  context = createTestContext();
});

afterEach(() => {
  context.connection.close();
});

describe('GET /api/v1/health', () => {
  it('reports the service as healthy', async () => {
    const response = await request(context.app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });
});

describe('catalog endpoints', () => {
  it('lists categories in display order', async () => {
    const response = await request(context.app).get('/api/v1/categories');
    const body = apiSuccessSchema(z.array(CategorySchema)).parse(response.body);
    expect(body.data.map((category) => category.slug)).toEqual([
      'cafes',
      'pasteleria',
      'helados',
      'sandwiches',
      'bebidas',
    ]);
  });

  it('filters products by category', async () => {
    const categories = apiSuccessSchema(z.array(CategorySchema)).parse(
      (await request(context.app).get('/api/v1/categories')).body,
    ).data;
    const helados = categories.find((category) => category.slug === 'helados');

    const response = await request(context.app)
      .get('/api/v1/products')
      .query({ categoryId: helados?.id });

    const body = apiSuccessSchema(z.array(ProductSchema)).parse(response.body);
    expect(body.data.map((product) => product.name)).toEqual([
      'Helado 1 sabor',
      'Helado 2 sabores',
    ]);
  });

  it('rejects an invalid category filter with a standard error payload', async () => {
    const response = await request(context.app).get('/api/v1/products').query({ categoryId: 'x' });
    expect(response.status).toBe(400);
    const body = ApiErrorBodySchema.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.issues?.[0]?.path).toBe('categoryId');
  });

  it('serves the public menu grouped by category', async () => {
    const response = await request(context.app).get('/api/v1/menu');
    const body = apiSuccessSchema(MenuSchema).parse(response.body);
    expect(body.data.categories).toHaveLength(5);
    expect(body.data.categories.every((category) => category.products.length > 0)).toBe(true);
  });
});

describe('GET /api/v1/orders', () => {
  it('returns kitchen orders oldest first with their items', async () => {
    const response = await request(context.app)
      .get('/api/v1/orders')
      .query({ status: 'new,preparing,ready' });

    const body = apiSuccessSchema(z.array(OrderSchema)).parse(response.body);
    expect(body.data.map((order) => order.status)).toEqual([
      'ready',
      'preparing',
      'preparing',
      'new',
    ]);
    expect(body.data.at(-1)?.items[0]).toMatchObject({
      productName: 'Capuchino',
      quantity: 2,
      quickNotes: ['no-sugar'],
    });
  });

  it('filters WhatsApp orders', async () => {
    const response = await request(context.app)
      .get('/api/v1/orders')
      .query({ channel: 'whatsapp' });
    const body = apiSuccessSchema(z.array(OrderSchema)).parse(response.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.customerName).toBe('Camila R.');
  });

  it('rejects unknown statuses', async () => {
    const response = await request(context.app).get('/api/v1/orders').query({ status: 'lost' });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/v1/tables', () => {
  it('derives each table status from its open orders', async () => {
    const response = await request(context.app).get('/api/v1/tables');
    const body = apiSuccessSchema(z.array(TableOverviewSchema)).parse(response.body);
    const statusByNumber = Object.fromEntries(
      body.data.map((table) => [table.number, table.status]),
    );

    expect(body.data).toHaveLength(10);
    expect(statusByNumber).toMatchObject({
      1: 'free',
      2: 'occupied',
      4: 'awaiting-payment',
      5: 'occupied',
      8: 'occupied',
    });
    expect(body.data.find((table) => table.number === 4)?.openTotalClp).toBe(9800);
  });
});

describe('unknown routes', () => {
  it('answer 404 with the standard error payload', async () => {
    const response = await request(context.app).get('/api/v1/bodega');
    expect(response.status).toBe(404);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND');
  });
});
