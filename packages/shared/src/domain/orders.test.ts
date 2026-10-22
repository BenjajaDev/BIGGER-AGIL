import { describe, expect, it } from 'vitest';
import { canTransitionOrder, CreateOrderInputSchema, OrderListFilterSchema } from './orders.js';

const productId = '4f1c2b9e-7a1d-4c3e-9f8a-2b6d5e4c3a21';
const tableId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('canTransitionOrder', () => {
  it.each([
    ['new', 'preparing'],
    ['preparing', 'ready'],
    ['ready', 'delivered'],
    ['delivered', 'paid'],
    ['new', 'cancelled'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(true);
  });

  it.each([
    ['new', 'ready'],
    ['ready', 'new'],
    ['paid', 'new'],
    ['delivered', 'cancelled'],
  ] as const)('rejects %s → %s', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(false);
  });
});

describe('CreateOrderInputSchema', () => {
  it('requires a table for dine-in orders', () => {
    const result = CreateOrderInputSchema.safeParse({
      channel: 'dine-in',
      items: [{ productId, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('requires a customer name for WhatsApp orders', () => {
    const result = CreateOrderInputSchema.safeParse({
      channel: 'whatsapp',
      items: [{ productId, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults to a valid dine-in order', () => {
    const result = CreateOrderInputSchema.parse({
      channel: 'dine-in',
      tableId,
      items: [{ productId, quantity: 2, quickNotes: ['no-sugar'] }],
    });
    expect(result.items[0]).toEqual({
      productId,
      quantity: 2,
      quickNotes: ['no-sugar'],
      note: null,
      options: [],
      comboChoices: [],
    });
  });

  it('keeps the chosen options and combo picks', () => {
    const groupId = 'a1b2c3d4-e5f6-4a3b-8c2d-1e0f9a8b7c60';
    const optionId = 'a1b2c3d4-e5f6-4a3b-8c2d-1e0f9a8b7c61';
    const result = CreateOrderInputSchema.parse({
      channel: 'dine-in',
      tableId,
      items: [{ productId, quantity: 1, options: [{ groupId, optionId }] }],
    });
    expect(result.items[0]?.options).toEqual([{ groupId, optionId }]);
  });
});

describe('OrderListFilterSchema', () => {
  it('parses a comma-separated status list', () => {
    expect(OrderListFilterSchema.parse({ status: 'new,preparing' })).toEqual({
      status: ['new', 'preparing'],
    });
  });

  it('rejects unknown statuses', () => {
    expect(OrderListFilterSchema.safeParse({ status: 'new,lost' }).success).toBe(false);
  });
});
