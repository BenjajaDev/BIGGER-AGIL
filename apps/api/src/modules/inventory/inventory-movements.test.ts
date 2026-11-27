import { StockMovementSchema, SupplySchema, apiSuccessSchema } from '@bigger/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createTestContext,
  TEST_ADMIN_PIN,
  type TestContext,
} from '../../../test/helpers/test-app.js';

let context: TestContext;
let agent: ReturnType<typeof request.agent>;

const MovementsBody = apiSuccessSchema(z.array(StockMovementSchema));

beforeEach(async () => {
  context = await createTestContext();
  agent = request.agent(context.app);
  await agent.post('/api/v1/admin/session').send({ pin: TEST_ADMIN_PIN });
});
afterEach(() => {
  context.connection.close();
});

async function createSupply(name: string): Promise<string> {
  const response = await agent.post('/api/v1/admin/inventory/supplies').send({
    name,
    unit: 'kg',
    minStock: 1,
    costPerUnitClp: 1000,
    supplierId: null,
    expiresOn: null,
  });
  expect(response.status).toBe(201);
  return apiSuccessSchema(SupplySchema).parse(response.body).data.id;
}

async function register(id: string, quantity: number): Promise<void> {
  const response = await agent
    .post(`/api/v1/admin/inventory/supplies/${id}/movements`)
    .send({ kind: 'purchase', quantity });
  expect(response.status).toBe(201);
}

describe('GET /admin/inventory/movements', () => {
  it('lists every supply when no filter is given', async () => {
    const first = await createSupply('Palta');
    const second = await createSupply('Limón');
    await register(first, 2);
    await register(second, 3);
    const response = await agent.get('/api/v1/admin/inventory/movements');
    const supplyOf = MovementsBody.parse(response.body).data.map((m) => m.supplyId);
    expect(supplyOf).toEqual(expect.arrayContaining([first, second]));
  });

  it('filters by supply and honours the limit', async () => {
    const first = await createSupply('Palta');
    const second = await createSupply('Limón');
    await register(first, 1);
    await register(first, 2);
    await register(second, 3);
    const filtered = await agent
      .get('/api/v1/admin/inventory/movements')
      .query({ supplyId: first, limit: 1 });
    const data = MovementsBody.parse(filtered.body).data;
    expect(data).toHaveLength(1);
    expect(data[0]?.supplyId).toBe(first);
    const all = await agent.get('/api/v1/admin/inventory/movements').query({ supplyId: first });
    expect(MovementsBody.parse(all.body).data.every((m) => m.supplyId === first)).toBe(true);
  });

  it('rejects a malformed supply id and an out-of-range limit', async () => {
    const badId = await agent.get('/api/v1/admin/inventory/movements').query({ supplyId: 'x' });
    expect(badId.status).toBe(400);
    const badLimit = await agent.get('/api/v1/admin/inventory/movements').query({ limit: 51 });
    expect(badLimit.status).toBe(400);
  });
});
