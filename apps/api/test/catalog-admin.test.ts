import {
  AdminCategorySchema,
  AdminModifierGroupSchema,
  AdminProductSchema,
  AdminSessionSchema,
  ApiErrorBodySchema,
  apiSuccessSchema,
  MenuSchema,
  type RealtimeEvent,
} from '@bigger/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestContext, TEST_ADMIN_PIN, type TestContext } from './helpers/test-app.js';

let context: TestContext;
let agent: ReturnType<typeof request.agent>;
let events: RealtimeEvent[];

const ProductsBody = apiSuccessSchema(z.array(AdminProductSchema));
const ProductBody = apiSuccessSchema(AdminProductSchema);
const CategoriesBody = apiSuccessSchema(z.array(AdminCategorySchema));
const GroupsBody = apiSuccessSchema(z.array(AdminModifierGroupSchema));

async function login(): Promise<void> {
  const response = await agent.post('/api/v1/admin/session').send({ pin: TEST_ADMIN_PIN });
  expect(response.status).toBe(200);
}

async function listProducts(includeArchived = false) {
  const response = await agent.get('/api/v1/admin/products').query({ includeArchived });
  return ProductsBody.parse(response.body).data;
}

async function productNamed(name: string) {
  const product = (await listProducts(true)).find((candidate) => candidate.name === name);
  if (!product) throw new Error(`Producto de ejemplo no encontrado: ${name}`);
  return product;
}

async function categoryId(slug: string): Promise<string> {
  const response = await agent.get('/api/v1/admin/categories');
  const category = CategoriesBody.parse(response.body).data.find((c) => c.slug === slug);
  if (!category) throw new Error(`Categoría no encontrada: ${slug}`);
  return category.id;
}

async function groupId(name: string): Promise<string> {
  const response = await agent.get('/api/v1/admin/modifier-groups');
  const group = GroupsBody.parse(response.body).data.find((g) => g.name === name);
  if (!group) throw new Error(`Personalización no encontrada: ${name}`);
  return group.id;
}

async function publicProductNames(): Promise<string[]> {
  const menu = apiSuccessSchema(MenuSchema).parse(
    (await request(context.app).get('/api/v1/menu')).body,
  );
  return menu.data.categories.flatMap((category) =>
    category.products.map((product) => product.name),
  );
}

beforeEach(async () => {
  context = await createTestContext({ withDemoOrders: false });
  agent = request.agent(context.app);
  events = [];
  context.eventHub.subscribe((event) => events.push(event));
});

afterEach(() => {
  context.connection.close();
});

describe('admin session', () => {
  it('rejects catalog changes without a session', async () => {
    const response = await request(context.app).get('/api/v1/admin/products');
    expect(response.status).toBe(401);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('UNAUTHORIZED');
  });

  it('logs in with the PIN using an httpOnly, SameSite=Strict cookie scoped to admin routes', async () => {
    const response = await agent.post('/api/v1/admin/session').send({ pin: TEST_ADMIN_PIN });
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^bigger_admin=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/admin/);

    const session = await agent.get('/api/v1/admin/session');
    expect(apiSuccessSchema(AdminSessionSchema).parse(session.body).data.authenticated).toBe(true);
  });

  it('rejects a wrong PIN and blocks after repeated failures', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await agent.post('/api/v1/admin/session').send({ pin: '000000' });
      expect(response.status).toBe(401);
    }
    const blocked = await agent.post('/api/v1/admin/session').send({ pin: TEST_ADMIN_PIN });
    expect(blocked.status).toBe(429);
    expect(ApiErrorBodySchema.parse(blocked.body).error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('logs out by clearing the cookie', async () => {
    await login();
    await agent.delete('/api/v1/admin/session');
    expect((await agent.get('/api/v1/admin/products')).status).toBe(401);
  });
});

describe('products', () => {
  beforeEach(login);

  it('creates a product with customizations and shows it in the public menu', async () => {
    const input = {
      kind: 'single',
      categoryId: await categoryId('cafes'),
      name: 'Mocaccino',
      description: 'Espresso, chocolate y leche.',
      priceClp: 2900,
      allergens: ['lacteos'],
      isAvailable: true,
      modifierGroupIds: [await groupId('Tipo de leche')],
    };
    const response = await agent.post('/api/v1/admin/products').send(input);

    expect(response.status).toBe(201);
    const product = ProductBody.parse(response.body).data;
    expect(product).toMatchObject({ name: 'Mocaccino', kind: 'single', archivedAt: null });
    expect(product.modifierGroupIds).toHaveLength(1);
    expect(await publicProductNames()).toContain('Mocaccino');
    expect(events).toContainEqual({ type: 'catalog.updated' });
  });

  it('edits a product, replacing its customizations', async () => {
    const capuchino = await productNamed('Capuchino');
    const response = await agent.put(`/api/v1/admin/products/${capuchino.id}`).send({
      kind: 'single',
      categoryId: capuchino.categoryId,
      name: 'Capuchino italiano',
      description: capuchino.description,
      priceClp: 2700,
      allergens: capuchino.allergens,
      isAvailable: true,
      modifierGroupIds: [],
    });

    const product = ProductBody.parse(response.body).data;
    expect(product).toMatchObject({
      name: 'Capuchino italiano',
      priceClp: 2700,
      modifierGroupIds: [],
    });
  });

  it('rejects a duplicate name in the same category', async () => {
    const cafes = await categoryId('cafes');
    const response = await agent.post('/api/v1/admin/products').send({
      kind: 'single',
      categoryId: cafes,
      name: '  capuchino ',
      description: '',
      priceClp: 1000,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
    });
    expect(response.status).toBe(409);
  });

  it('archives instead of deleting, and can restore', async () => {
    const brownie = await productNamed('Brownie');

    const archived = await agent.delete(`/api/v1/admin/products/${brownie.id}`);
    expect(ProductBody.parse(archived.body).data.archivedAt).not.toBeNull();
    expect(await publicProductNames()).not.toContain('Brownie');
    expect((await listProducts()).map((p) => p.name)).not.toContain('Brownie');
    expect((await listProducts(true)).map((p) => p.name)).toContain('Brownie');

    await agent.post(`/api/v1/admin/products/${brownie.id}/restore`);
    expect(await publicProductNames()).toContain('Brownie');
  });

  it('refuses to delete a product that is part of an active combo', async () => {
    const medialuna = await productNamed('Medialuna');
    const response = await agent.delete(`/api/v1/admin/products/${medialuna.id}`);
    expect(response.status).toBe(409);
    expect(ApiErrorBodySchema.parse(response.body).error.message).toContain('Once BIGGER');
  });

  it('returns 404 for an unknown product and 400 for a malformed id', async () => {
    expect(
      (await agent.delete('/api/v1/admin/products/0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e')).status,
    ).toBe(404);
    expect((await agent.delete('/api/v1/admin/products/abc')).status).toBe(400);
  });
});

describe('combos', () => {
  beforeEach(login);

  async function comboInput(overrides: Record<string, unknown> = {}) {
    return {
      kind: 'combo',
      categoryId: await categoryId('combos'),
      name: 'Desayuno',
      description: 'Café y sándwich.',
      priceClp: 6500,
      isAvailable: true,
      comboSlots: [
        {
          name: 'Café a elección',
          options: [
            { productId: (await productNamed('Americano')).id, extraPriceClp: 0 },
            { productId: (await productNamed('Latte')).id, extraPriceClp: 300 },
          ],
        },
        {
          name: 'Sándwich',
          options: [{ productId: (await productNamed('Sándwich ave palta')).id, extraPriceClp: 0 }],
        },
      ],
      ...overrides,
    };
  }

  it('creates a combo with choice slots and derives its allergens', async () => {
    const input = await comboInput();
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(201);
    const combo = ProductBody.parse(response.body).data;
    expect(combo.comboSlots.map((slot) => slot.options.length)).toEqual([2, 1]);
    expect(combo.allergens).toEqual(['gluten', 'lacteos']);
  });

  it('rejects a combo nested inside another combo, pointing at the offending field', async () => {
    const once = await productNamed('Once BIGGER');
    const input = await comboInput({
      comboSlots: [{ name: 'Combo', options: [{ productId: once.id, extraPriceClp: 0 }] }],
    });
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues).toEqual([
      { path: 'comboSlots.0.options.0.productId', message: 'Un combo no puede incluir otro combo' },
    ]);
  });

  it('is hidden from the public menu while a slot has nothing available', async () => {
    const input = await comboInput();
    await agent.post('/api/v1/admin/products').send(input);
    const sandwich = await productNamed('Sándwich ave palta');
    await agent.put(`/api/v1/admin/products/${sandwich.id}`).send({
      kind: 'single',
      categoryId: sandwich.categoryId,
      name: sandwich.name,
      description: sandwich.description,
      priceClp: sandwich.priceClp,
      allergens: sandwich.allergens,
      isAvailable: false,
      modifierGroupIds: [],
    });

    expect(await publicProductNames()).not.toContain('Desayuno');
  });
});

describe('modifier groups', () => {
  beforeEach(login);

  it('creates a reusable group and reports how many products use it', async () => {
    const response = await agent.post('/api/v1/admin/modifier-groups').send({
      name: 'Endulzante',
      minSelections: 0,
      maxSelections: 1,
      options: [
        { name: 'Azúcar', priceDeltaClp: 0, isAvailable: true },
        { name: 'Stevia', priceDeltaClp: 0, isAvailable: true },
      ],
    });
    expect(response.status).toBe(201);
    expect(apiSuccessSchema(AdminModifierGroupSchema).parse(response.body).data.productCount).toBe(
      0,
    );

    const milk = (await agent.get('/api/v1/admin/modifier-groups')).body as unknown;
    const leche = GroupsBody.parse(milk).data.find((group) => group.name === 'Tipo de leche');
    expect(leche?.productCount).toBe(2);
  });

  it('keeps the id of edited options and changes prices in one place', async () => {
    const id = await groupId('Tipo de leche');
    const before = apiSuccessSchema(AdminModifierGroupSchema).parse(
      (await agent.get(`/api/v1/admin/modifier-groups/${id}`)).body,
    ).data;
    const vegetal = before.options.find((option) => option.name === 'Vegetal');

    const response = await agent.put(`/api/v1/admin/modifier-groups/${id}`).send({
      name: before.name,
      minSelections: 0,
      maxSelections: 1,
      options: before.options.map((option) =>
        option.id === vegetal?.id ? { ...option, priceDeltaClp: 800 } : option,
      ),
    });

    const after = apiSuccessSchema(AdminModifierGroupSchema).parse(response.body).data;
    expect(after.options.find((option) => option.id === vegetal?.id)?.priceDeltaClp).toBe(800);
  });

  it('validates selection rules', async () => {
    const response = await agent.post('/api/v1/admin/modifier-groups').send({
      name: 'Toppings',
      minSelections: 0,
      maxSelections: 4,
      options: [{ name: 'Chips', priceDeltaClp: 300, isAvailable: true }],
    });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe('maxSelections');
  });

  it('deleting a group removes it from every product', async () => {
    const id = await groupId('Extras');
    expect((await agent.delete(`/api/v1/admin/modifier-groups/${id}`)).status).toBe(200);
    const capuchino = await productNamed('Capuchino');
    expect(capuchino.modifierGroupIds).not.toContain(id);
  });
});

describe('categories', () => {
  beforeEach(login);

  it('creates a category with a unique, readable slug', async () => {
    const response = await agent.post('/api/v1/admin/categories').send({ name: 'Té e infusiones' });
    expect(response.status).toBe(201);
    expect(apiSuccessSchema(AdminCategorySchema).parse(response.body).data.slug).toBe(
      'te-e-infusiones',
    );
  });

  it('refuses to delete a category that still has products', async () => {
    const helados = await categoryId('helados');
    const response = await agent.delete(`/api/v1/admin/categories/${helados}`);
    expect(response.status).toBe(409);
  });

  it('archives an empty category and hides it from the public menu categories', async () => {
    const created = await agent.post('/api/v1/admin/categories').send({ name: 'Temporada' });
    const id = apiSuccessSchema(AdminCategorySchema).parse(created.body).data.id;

    const archived = await agent.delete(`/api/v1/admin/categories/${id}`);
    expect(
      apiSuccessSchema(AdminCategorySchema).parse(archived.body).data.archivedAt,
    ).not.toBeNull();

    const publicCategories = (await request(context.app).get('/api/v1/categories')).body as {
      data: { id: string }[];
    };
    expect(publicCategories.data.map((category) => category.id)).not.toContain(id);
  });
});
