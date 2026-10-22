import {
  AdminCategorySchema,
  AdminModifierGroupSchema,
  AdminProductSchema,
  AdminSessionSchema,
  ApiErrorBodySchema,
  apiSuccessSchema,
  MenuSchema,
  ProductTypeSchema,
  UploadedImageSchema,
  type RealtimeEvent,
} from '@bigger/shared';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestContext, TEST_ADMIN_PIN, type TestContext } from './helpers/test-app.js';

const BASE_DEFAULTS = { typeId: null, subtitle: '', image: null, promotion: null };
const SINGLE_DEFAULTS = { ...BASE_DEFAULTS, sizes: [] };

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

async function uploadPhoto(width = 1600, height = 900) {
  const png = await sharp({
    create: { width, height, channels: 3, background: { r: 192, g: 39, b: 45 } },
  })
    .png()
    .toBuffer();
  const response = await agent
    .post('/api/v1/admin/images')
    .set('Content-Type', 'image/png')
    .send(png);
  expect(response.status).toBe(201);
  return apiSuccessSchema(UploadedImageSchema).parse(response.body).data;
}

async function publicMenu() {
  return apiSuccessSchema(MenuSchema).parse((await request(context.app).get('/api/v1/menu')).body)
    .data;
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
      ...SINGLE_DEFAULTS,
      categoryId: await categoryId('fajitas-pollo'),
      name: 'Pollo 3',
      priceClp: 4400,
      description: 'Pollo, palta y tomate.',
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [await groupId('Salsas')],
    };
    const response = await agent.post('/api/v1/admin/products').send(input);

    expect(response.status).toBe(201);
    const product = ProductBody.parse(response.body).data;
    expect(product).toMatchObject({ name: 'Pollo 3', kind: 'single', archivedAt: null });
    expect(product.modifierGroupIds).toHaveLength(1);
    expect(await publicProductNames()).toContain('Pollo 3');
    expect(events).toContainEqual({ type: 'catalog.updated' });
  });

  it('edits a product, replacing its customizations', async () => {
    const chilena = await productNamed('Chilena');
    const response = await agent.put(`/api/v1/admin/products/${chilena.id}`).send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: chilena.categoryId,
      name: 'Chilena especial',
      description: '',
      priceClp: 5300,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
    });

    const product = ProductBody.parse(response.body).data;
    expect(product).toMatchObject({
      name: 'Chilena especial',
      priceClp: 5300,
      modifierGroupIds: [],
    });
  });

  it('rejects a duplicate name in the same category', async () => {
    const churrascos = await categoryId('churrascos');
    const response = await agent.post('/api/v1/admin/products').send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: churrascos,
      name: '  luco ',
      description: '',
      priceClp: 1000,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
    });
    expect(response.status).toBe(409);
  });

  it('requires a price when the product has no sizes', async () => {
    const pasteles = await categoryId('pasteles');
    const response = await agent.post('/api/v1/admin/products').send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: pasteles,
      name: 'Brownie',
      description: '',
      priceClp: null,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
    });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe('priceClp');
  });

  it('archives instead of deleting, and can restore', async () => {
    const facturas = await productNamed('Facturas');

    const archived = await agent.delete(`/api/v1/admin/products/${facturas.id}`);
    expect(ProductBody.parse(archived.body).data.archivedAt).not.toBeNull();
    expect(await publicProductNames()).not.toContain('Facturas');
    expect((await listProducts()).map((p) => p.name)).not.toContain('Facturas');
    expect((await listProducts(true)).map((p) => p.name)).toContain('Facturas');

    await agent.post(`/api/v1/admin/products/${facturas.id}/restore`);
    expect(await publicProductNames()).toContain('Facturas');
  });

  it('returns 404 for an unknown product and 400 for a malformed id', async () => {
    expect(
      (await agent.delete('/api/v1/admin/products/0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e')).status,
    ).toBe(404);
    expect((await agent.delete('/api/v1/admin/products/abc')).status).toBe(400);
  });
});

describe('sizes and per-size rules', () => {
  beforeEach(login);

  async function saladInput(overrides: Record<string, unknown> = {}) {
    const proteina = await groupId('Proteína');
    const vegetales = await groupId('Vegetales');
    return {
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: await categoryId('ensaladas'),
      name: 'Ensalada de la casa',
      description: '',
      priceClp: null,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [proteina, vegetales],
      sizes: [
        {
          name: 'Grande',
          priceClp: 5500,
          groupRules: [
            { groupId: proteina, minSelections: 1, maxSelections: 1 },
            { groupId: vegetales, minSelections: 4, maxSelections: 4 },
          ],
        },
        {
          name: 'Mediana',
          priceClp: 3900,
          groupRules: [{ groupId: proteina, minSelections: 0, maxSelections: 0 }],
        },
      ],
      ...overrides,
    };
  }

  it('stores sizes with their rules and uses the cheapest size as the "desde" price', async () => {
    const input = await saladInput();
    const response = await agent.post('/api/v1/admin/products').send(input);

    expect(response.status).toBe(201);
    const product = ProductBody.parse(response.body).data;
    expect(product.priceClp).toBe(3900);
    expect(product.sizes.map((size) => [size.name, size.priceClp, size.groupRules.length])).toEqual(
      [
        ['Grande', 5500, 2],
        ['Mediana', 3900, 1],
      ],
    );
  });

  it('keeps size ids when the product is edited', async () => {
    const salad = await saladInput();
    const created = ProductBody.parse(
      (await agent.post('/api/v1/admin/products').send(salad)).body,
    ).data;
    const input = await saladInput({
      sizes: created.sizes.map((size) => ({ ...size, priceClp: size.priceClp + 100 })),
    });

    const updated = ProductBody.parse(
      (await agent.put(`/api/v1/admin/products/${created.id}`).send(input)).body,
    ).data;

    expect(updated.sizes.map((size) => size.id)).toEqual(created.sizes.map((size) => size.id));
    expect(updated.sizes[0]?.priceClp).toBe(5600);
  });

  it('rejects a rule for a customization the product does not offer', async () => {
    const proteina = await groupId('Proteína');
    const input = await saladInput({ modifierGroupIds: [] });
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe(
      'sizes.0.groupRules.0.groupId',
    );
    expect(proteina).toBeTruthy();
  });

  it('rejects a rule that asks for more options than exist', async () => {
    const proteina = await groupId('Proteína');
    const vegetales = await groupId('Vegetales');
    const input = await saladInput({
      sizes: [
        {
          name: 'Gigante',
          priceClp: 9900,
          groupRules: [
            { groupId: proteina, minSelections: 7, maxSelections: 7 },
            { groupId: vegetales, minSelections: 0, maxSelections: 4 },
          ],
        },
      ],
    });
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues).toEqual([
      {
        path: 'sizes.0.groupRules.0.maxSelections',
        message: 'Esa personalización tiene solo 6 opciones',
      },
    ]);
  });
});

describe('promotions', () => {
  beforeEach(login);

  async function promote(
    name: string,
    promotion: { startsOn: string | null; endsOn: string | null },
  ) {
    const product = await productNamed(name);
    return agent.put(`/api/v1/admin/products/${product.id}`).send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: product.categoryId,
      name: product.name,
      subtitle: '2 x $5.000 los martes',
      description: product.description,
      priceClp: product.priceClp,
      allergens: product.allergens,
      isAvailable: true,
      modifierGroupIds: product.modifierGroupIds,
      promotion,
    });
  }

  it('lists a running promotion first in the public menu', async () => {
    expect((await promote('Chemilico', { startsOn: null, endsOn: null })).status).toBe(200);
    const menu = await publicMenu();
    expect(menu.promotions.map((product) => [product.name, product.subtitle])).toEqual([
      ['Chemilico', '2 x $5.000 los martes'],
    ]);
  });

  it('keeps a scheduled promotion out of the menu until it starts', async () => {
    await promote('Chemilico', { startsOn: '2999-01-01', endsOn: null });
    expect((await publicMenu()).promotions).toEqual([]);
  });

  it('rejects an end date before the start date', async () => {
    const response = await promote('Chemilico', { startsOn: '2026-12-31', endsOn: '2026-12-01' });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe(
      'promotion.endsOn',
    );
  });
});

describe('images', () => {
  beforeEach(login);

  it('re-encodes an upload to web-ready WebP files and serves them with a long cache', async () => {
    const image = await uploadPhoto(1600, 900);

    expect(image).toMatchObject({ width: 1200, height: 675 });
    expect(existsSync(join(context.uploadsDir, `${image.id}-card.webp`))).toBe(true);
    expect(existsSync(join(context.uploadsDir, `${image.id}-thumb.webp`))).toBe(true);

    const file = await request(context.app).get(`/api/v1/media/${image.id}-card.webp`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toContain('immutable');
  });

  it('rejects a file that only pretends to be an image', async () => {
    const response = await agent
      .post('/api/v1/admin/images')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('esto no es una foto'));
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.message).toBe(
      'El archivo no es una imagen válida',
    );
  });

  it('rejects files over 8 MB', async () => {
    const response = await agent
      .post('/api/v1/admin/images')
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.alloc(9 * 1024 * 1024));
    expect(response.status).toBe(413);
    expect(ApiErrorBodySchema.parse(response.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('requires the admin session to upload', async () => {
    const response = await request(context.app)
      .post('/api/v1/admin/images')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('x'));
    expect(response.status).toBe(401);
  });

  it('attaches a photo with its framing to a product and a category', async () => {
    const image = await uploadPhoto();
    const luco = await productNamed('Luco');
    const saved = await agent.put(`/api/v1/admin/products/${luco.id}`).send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: luco.categoryId,
      name: luco.name,
      description: '',
      priceClp: luco.priceClp,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
      image: { imageId: image.id, focusY: 35 },
    });
    expect(ProductBody.parse(saved.body).data.image).toEqual({ ...image, focusY: 35 });

    const churrascos = await categoryId('churrascos');
    const category = await agent
      .put(`/api/v1/admin/categories/${churrascos}`)
      .send({ name: 'Churrascos', image: { imageId: image.id, focusY: 50 } });
    expect(apiSuccessSchema(AdminCategorySchema).parse(category.body).data.image?.id).toBe(
      image.id,
    );
  });

  it('rejects a reference to an image that was never uploaded', async () => {
    const luco = await productNamed('Luco');
    const response = await agent.put(`/api/v1/admin/products/${luco.id}`).send({
      kind: 'single',
      ...SINGLE_DEFAULTS,
      categoryId: luco.categoryId,
      name: luco.name,
      description: '',
      priceClp: luco.priceClp,
      allergens: [],
      isAvailable: true,
      modifierGroupIds: [],
      image: { imageId: '0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e', focusY: 50 },
    });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe('image.imageId');
  });
});

describe('product types', () => {
  beforeEach(login);

  const TypesBody = apiSuccessSchema(z.array(ProductTypeSchema));

  it('lists the seeded templates with their pre-filled configuration', async () => {
    const types = TypesBody.parse((await agent.get('/api/v1/admin/product-types')).body).data;
    const ensalada = types.find((type) => type.name === 'Ensalada armable');
    expect(ensalada?.sizes.map((size) => size.name)).toEqual(['Grande', 'Pequeña']);
    expect(ensalada?.modifierGroupIds).toHaveLength(2);
    expect(types.find((type) => type.name === 'Fajita')?.productCount).toBe(12);
  });

  it('creates a combo template and deletes it, leaving products untouched', async () => {
    const created = await agent.post('/api/v1/admin/product-types').send({
      name: 'Combo churrasco + pastel',
      description: 'Un churrasco y un pastel opcional.',
      kind: 'combo',
      sizes: [],
      modifierGroupIds: [],
      comboSlots: [
        { name: 'Churrasco', isRequired: true },
        { name: 'Pastel', isRequired: false },
      ],
    });
    expect(created.status).toBe(201);
    const type = apiSuccessSchema(ProductTypeSchema).parse(created.body).data;

    const fajitaType = TypesBody.parse(
      (await agent.get('/api/v1/admin/product-types')).body,
    ).data.find((candidate) => candidate.name === 'Fajita');
    if (!fajitaType) throw new Error('Falta el tipo Fajita');
    expect((await agent.delete(`/api/v1/admin/product-types/${fajitaType.id}`)).status).toBe(200);
    const italiana = await productNamed('Italiana');
    expect(italiana.typeId).toBeNull();
    expect(italiana.modifierGroupIds).toHaveLength(1);
    expect(type.comboSlots).toHaveLength(2);
  });

  it('rejects a template that references a missing customization', async () => {
    const response = await agent.post('/api/v1/admin/product-types').send({
      name: 'Raro',
      description: '',
      kind: 'single',
      sizes: [],
      modifierGroupIds: ['0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e'],
      comboSlots: [],
    });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe(
      'modifierGroupIds',
    );
  });
});

describe('combos', () => {
  beforeEach(login);

  async function comboInput(overrides: Record<string, unknown> = {}) {
    return {
      kind: 'combo',
      ...BASE_DEFAULTS,
      categoryId: await categoryId('churrascos'),
      name: 'Churrasco + pastel',
      description: '',
      priceClp: 5500,
      isAvailable: true,
      comboSlots: [
        {
          name: 'Churrasco',
          isRequired: true,
          options: [
            { productId: (await productNamed('Luco')).id, extraPriceClp: 0 },
            { productId: (await productNamed('Italiano')).id, extraPriceClp: 900 },
          ],
        },
        {
          name: 'Pastel',
          isRequired: false,
          options: [{ productId: (await productNamed('Pie limón')).id, extraPriceClp: 0 }],
        },
      ],
      ...overrides,
    };
  }

  it('creates a combo with a required and an optional slot', async () => {
    const input = await comboInput();
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(201);
    const combo = ProductBody.parse(response.body).data;
    expect(
      combo.comboSlots.map((slot) => [slot.name, slot.isRequired, slot.options.length]),
    ).toEqual([
      ['Churrasco', true, 2],
      ['Pastel', false, 1],
    ]);
  });

  it('needs at least one required slot', async () => {
    const input = await comboInput();
    const response = await agent.post('/api/v1/admin/products').send({
      ...input,
      comboSlots: input.comboSlots.map((slot) => ({ ...slot, isRequired: false })),
    });
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues?.[0]?.path).toBe('comboSlots');
  });

  it('refuses to delete a product that is part of an active combo', async () => {
    const input = await comboInput();
    await agent.post('/api/v1/admin/products').send(input);
    const luco = await productNamed('Luco');
    const response = await agent.delete(`/api/v1/admin/products/${luco.id}`);
    expect(response.status).toBe(409);
    expect(ApiErrorBodySchema.parse(response.body).error.message).toContain('Churrasco + pastel');
  });

  it('rejects a combo nested inside another combo, pointing at the offending field', async () => {
    const combo = await comboInput();
    const created = ProductBody.parse(
      (await agent.post('/api/v1/admin/products').send(combo)).body,
    ).data;
    const input = await comboInput({
      name: 'Doble',
      comboSlots: [
        { name: 'Combo', isRequired: true, options: [{ productId: created.id, extraPriceClp: 0 }] },
      ],
    });
    const response = await agent.post('/api/v1/admin/products').send(input);
    expect(response.status).toBe(400);
    expect(ApiErrorBodySchema.parse(response.body).error.issues).toEqual([
      { path: 'comboSlots.0.options.0.productId', message: 'Un combo no puede incluir otro combo' },
    ]);
  });
});

describe('modifier groups', () => {
  beforeEach(login);

  it('reports how many products use each reusable group', async () => {
    const groups = GroupsBody.parse((await agent.get('/api/v1/admin/modifier-groups')).body).data;
    expect(groups.find((group) => group.name === 'Salsas')?.productCount).toBe(12);
  });

  it('keeps the id of edited options and changes prices in one place', async () => {
    const id = await groupId('Proteína');
    const before = apiSuccessSchema(AdminModifierGroupSchema).parse(
      (await agent.get(`/api/v1/admin/modifier-groups/${id}`)).body,
    ).data;
    const lengua = before.options.find((option) => option.name === 'Lengua');

    const response = await agent.put(`/api/v1/admin/modifier-groups/${id}`).send({
      name: before.name,
      minSelections: 0,
      maxSelections: 1,
      options: before.options.map((option) =>
        option.id === lengua?.id ? { ...option, priceDeltaClp: 800 } : option,
      ),
    });

    const after = apiSuccessSchema(AdminModifierGroupSchema).parse(response.body).data;
    expect(after.options.find((option) => option.id === lengua?.id)?.priceDeltaClp).toBe(800);
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
    const id = await groupId('Relleno');
    expect((await agent.delete(`/api/v1/admin/modifier-groups/${id}`)).status).toBe(200);
    const medialuna = await productNamed('Media luna');
    expect(medialuna.modifierGroupIds).not.toContain(id);
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
    const pasteles = await categoryId('pasteles');
    const response = await agent.delete(`/api/v1/admin/categories/${pasteles}`);
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
