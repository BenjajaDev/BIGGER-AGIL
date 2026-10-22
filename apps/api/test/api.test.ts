import {
  ApiErrorBodySchema,
  apiSuccessSchema,
  CategorySchema,
  MenuProductSchema,
  MenuSchema,
  OrderSchema,
  TableOverviewSchema,
  type MenuProduct,
} from '@bigger/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestContext, type TestContext } from './helpers/test-app.js';

let context: TestContext;

beforeEach(async () => {
  context = await createTestContext();
});

afterEach(() => {
  context.connection.close();
});

async function catalogProducts(): Promise<MenuProduct[]> {
  return apiSuccessSchema(z.array(MenuProductSchema)).parse(
    (await request(context.app).get('/api/v1/products')).body,
  ).data;
}

async function productNamed(name: string): Promise<MenuProduct> {
  const product = (await catalogProducts()).find((candidate) => candidate.name === name);
  if (!product) throw new Error(`El seed no tiene «${name}»`);
  return product;
}

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
      'churrascos',
      'sandwiches-especiales',
      'fajitas-vacuno',
      'fajitas-pollo',
      'fajitas-especiales',
      'ensaladas',
      'pasteles',
    ]);
  });

  it('filters products by category', async () => {
    const categories = apiSuccessSchema(z.array(CategorySchema)).parse(
      (await request(context.app).get('/api/v1/categories')).body,
    ).data;
    const pollo = categories.find((category) => category.slug === 'fajitas-pollo');

    const response = await request(context.app)
      .get('/api/v1/products')
      .query({ categoryId: pollo?.id });

    const body = apiSuccessSchema(z.array(MenuProductSchema)).parse(response.body);
    expect(body.data.map((product) => [product.name, product.priceClp])).toEqual([
      ['Italiana pollo', 4500],
      ['Pollo 1', 3900],
      ['Pollo 2', 4200],
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
    expect(body.data.categories).toHaveLength(7);
    expect(body.data.categories.every((category) => category.products.length > 0)).toBe(true);
    expect(body.data.promotions).toEqual([]);

    const products = body.data.categories.flatMap((category) => category.products);
    expect(products).toHaveLength(36);

    const fajita = products.find((product) => product.name === 'Chilena');
    expect(fajita?.modifierGroups.map((group) => group.name)).toEqual(['Salsas']);
  });

  it('describes the build-your-own salad: sizes, prices and per-size rules', async () => {
    const ensalada = await productNamed('Arma tu ensalada');
    const groupId = (name: string) =>
      ensalada.modifierGroups.find((group) => group.name === name)?.id;

    expect(ensalada.priceClp).toBe(2500);
    expect(ensalada.sizes.map((size) => [size.name, size.priceClp])).toEqual([
      ['Grande', 4900],
      ['Pequeña', 2500],
    ]);
    expect(ensalada.sizes[0]?.groupRules).toEqual(
      expect.arrayContaining([
        { groupId: groupId('Proteína'), minSelections: 1, maxSelections: 1 },
        { groupId: groupId('Vegetales'), minSelections: 4, maxSelections: 4 },
      ]),
    );
    expect(ensalada.sizes[1]?.groupRules).toEqual(
      expect.arrayContaining([
        { groupId: groupId('Proteína'), minSelections: 0, maxSelections: 0 },
      ]),
    );
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
    expect(body.data.at(-1)?.items[0]).toMatchObject({ productName: 'Chacarero', quantity: 2 });
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

describe('POST /api/v1/orders', () => {
  async function freeTable() {
    const tables = apiSuccessSchema(z.array(TableOverviewSchema)).parse(
      (await request(context.app).get('/api/v1/tables')).body,
    ).data;
    const table = tables.find((candidate) => candidate.status === 'free');
    if (!table) throw new Error('El seed no dejó ninguna mesa libre');
    return table;
  }

  it('creates a dine-in order, prices it on the server and publishes it', async () => {
    const table = await freeTable();
    const product = await productNamed('Chacarero');
    const events: unknown[] = [];
    context.eventHub.subscribe((event) => events.push(event));

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({
        channel: 'dine-in',
        tableId: table.id,
        items: [{ productId: product.id, quantity: 2, quickNotes: ['takeaway'] }],
      });

    expect(response.status).toBe(201);
    const order = apiSuccessSchema(OrderSchema).parse(response.body).data;
    expect(order.status).toBe('new');
    expect(order.tableLabel).toBe(table.label);
    expect(order.totalClp).toBe(4590 * 2);
    expect(order.items[0]).toMatchObject({
      productName: 'Chacarero',
      unitPriceClp: 4590,
      quantity: 2,
      quickNotes: ['takeaway'],
    });
    expect(events).toEqual([{ type: 'order.created', payload: order }]);
  });

  it('prices a salad by size and snapshots size, protein and vegetables', async () => {
    const table = await freeTable();
    const ensalada = await productNamed('Arma tu ensalada');
    const grande = ensalada.sizes.find((size) => size.name === 'Grande');
    const group = (name: string) => ensalada.modifierGroups.find((g) => g.name === name);
    const proteina = group('Proteína');
    const vegetales = group('Vegetales');
    const atun = proteina?.options.find((option) => option.name === 'Atún');
    if (!grande || !proteina || !vegetales || !atun) throw new Error('Seed de ensalada incompleto');

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({
        channel: 'dine-in',
        tableId: table.id,
        items: [
          {
            productId: ensalada.id,
            sizeId: grande.id,
            quantity: 1,
            options: [
              { groupId: proteina.id, optionId: atun.id },
              ...vegetales.options
                .slice(0, 4)
                .map((option) => ({ groupId: vegetales.id, optionId: option.id })),
            ],
          },
        ],
      });

    expect(response.status).toBe(201);
    const order = apiSuccessSchema(OrderSchema).parse(response.body).data;
    // $4.900 la grande + $500 por atún = $5.400, como en la carta.
    expect(order.totalClp).toBe(5400);
    expect(order.items[0]?.options.slice(0, 2)).toEqual([
      { kind: 'size', label: 'Tamaño', name: 'Grande', priceDeltaClp: 0 },
      { kind: 'modifier', label: 'Proteína', name: 'Atún', priceDeltaClp: 500 },
    ]);
  });

  it('rejects a small salad with protein: the size does not offer it', async () => {
    const table = await freeTable();
    const ensalada = await productNamed('Arma tu ensalada');
    const pequena = ensalada.sizes.find((size) => size.name === 'Pequeña');
    const proteina = ensalada.modifierGroups.find((g) => g.name === 'Proteína');
    const pollo = proteina?.options[0];
    if (!pequena || !proteina || !pollo) throw new Error('Seed de ensalada incompleto');

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({
        channel: 'dine-in',
        tableId: table.id,
        items: [
          {
            productId: ensalada.id,
            sizeId: pequena.id,
            quantity: 1,
            options: [{ groupId: proteina.id, optionId: pollo.id }],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues).toEqual(
      expect.arrayContaining([
        {
          path: 'items.0.options.0',
          message: 'Esa personalización no se ofrece en tamaño Pequeña',
        },
        { path: 'items.0.options', message: 'Elige al menos 3 en «Vegetales»' },
      ]),
    );
  });

  it('requires the filling of a media luna', async () => {
    const table = await freeTable();
    const medialuna = await productNamed('Media luna');

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({
        channel: 'dine-in',
        tableId: table.id,
        items: [{ productId: medialuna.id, quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues).toEqual([
      { path: 'items.0.options', message: 'Elige al menos 1 en «Relleno»' },
    ]);
  });

  it('marks the table occupied once the order exists', async () => {
    const table = await freeTable();
    const product = await productNamed('Luco');

    await request(context.app)
      .post('/api/v1/orders')
      .send({
        channel: 'dine-in',
        tableId: table.id,
        items: [{ productId: product.id, quantity: 1 }],
      });

    const tables = apiSuccessSchema(z.array(TableOverviewSchema)).parse(
      (await request(context.app).get('/api/v1/tables')).body,
    ).data;
    expect(tables.find((candidate) => candidate.id === table.id)?.status).toBe('occupied');
  });

  it('rejects a takeaway order without a customer name', async () => {
    const product = await productNamed('Luco');

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({ channel: 'takeaway', items: [{ productId: product.id, quantity: 1 }] });

    expect(response.status).toBe(400);
    const body = ApiErrorBodySchema.parse(response.body);
    expect(body.error.issues?.[0]?.path).toBe('customerName');
  });

  it('rejects a dine-in order without a table', async () => {
    const product = await productNamed('Luco');

    const response = await request(context.app)
      .post('/api/v1/orders')
      .send({ channel: 'dine-in', items: [{ productId: product.id, quantity: 1 }] });

    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe('tableId');
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
    // 2 × Luco ($3.990) + 1 × Cheesecake Berries ($3.900).
    expect(body.data.find((table) => table.number === 4)?.openTotalClp).toBe(11880);
  });
});

describe('unknown routes', () => {
  it('answer 404 with the standard error payload', async () => {
    const response = await request(context.app).get('/api/v1/bodega');
    expect(response.status).toBe(404);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND');
  });
});
