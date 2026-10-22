import type { CreateOrderInput, ModifierGroup, Order, RealtimeEvent } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../core/errors/app-error.js';
import type { RealtimePublisher } from '../../realtime/event-hub.js';
import type { NewOrder, OrderableProduct, OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

const leche: ModifierGroup = {
  id: 'g-1',
  name: 'Tipo de leche',
  minSelections: 0,
  maxSelections: 1,
  options: [
    { id: 'o-1', name: 'Almendra', priceDeltaClp: 500, isAvailable: true },
    { id: 'o-2', name: 'Sin lactosa', priceDeltaClp: 500, isAvailable: false },
  ],
};
const capuchino: OrderableProduct = {
  id: 'p-1',
  name: 'Capuchino',
  kind: 'single',
  priceClp: 2500,
  isAvailable: true,
  archivedAt: null,
  modifierGroups: [leche],
  comboSlots: [],
};
const brownie: OrderableProduct = {
  id: 'p-2',
  name: 'Brownie',
  kind: 'single',
  priceClp: 3200,
  isAvailable: true,
  archivedAt: null,
  modifierGroups: [],
  comboSlots: [],
};

function fakeOrder(order: NewOrder): Order {
  return {
    id: 'o-1',
    channel: order.channel,
    status: 'new',
    tableId: order.tableId,
    tableLabel: order.tableId === null ? null : 'Mesa 2',
    customerName: order.customerName,
    pickupAt: order.pickupAt?.toISOString() ?? null,
    items: order.items.map((item, index) => ({
      id: `i-${index}`,
      productId: item.productId,
      productName: item.productName,
      unitPriceClp: item.unitPriceClp,
      quantity: item.quantity,
      quickNotes: item.quickNotes,
      note: item.note,
      options: item.options.map(({ kind, label, name, priceDeltaClp }) => ({
        kind,
        label,
        name,
        priceDeltaClp,
      })),
    })),
    totalClp: order.totalClp,
    createdAt: '2026-10-22T12:00:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
  };
}

function setup(catalog: OrderableProduct[] = [capuchino, brownie]) {
  const created: NewOrder[] = [];
  const events: RealtimeEvent[] = [];
  const repository: OrdersRepository = {
    list: () => Promise.resolve([]),
    productsForOrder: (ids) =>
      Promise.resolve(catalog.filter((product) => ids.includes(product.id))),
    create: (order) => {
      created.push(order);
      return Promise.resolve(fakeOrder(order));
    },
  };
  const publisher: RealtimePublisher = {
    publish: (event) => {
      events.push(event);
    },
  };
  return { service: new OrdersService(repository, publisher), created, events };
}

function line(overrides: Partial<CreateOrderInput['items'][number]> = {}) {
  return {
    productId: 'p-1',
    quantity: 2,
    quickNotes: [],
    note: null,
    options: [],
    comboChoices: [],
    ...overrides,
  };
}

function dineInInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    channel: 'dine-in',
    tableId: 't-1',
    customerName: null,
    pickupAt: null,
    items: [line()],
    ...overrides,
  };
}

describe('OrdersService.create', () => {
  it('prices each line from the catalog and totals the order on the server', async () => {
    const { service, created } = setup();

    const order = await service.create(
      dineInInput({
        items: [
          line({ quantity: 2, quickNotes: ['no-sugar'], note: 'bien caliente' }),
          line({ productId: 'p-2', quantity: 1 }),
        ],
      }),
    );

    expect(created[0]?.totalClp).toBe(2500 * 2 + 3200);
    expect(order.totalClp).toBe(8200);
    expect(created[0]?.items[0]).toMatchObject({
      productId: 'p-1',
      productName: 'Capuchino',
      unitPriceClp: 2500,
      quantity: 2,
    });
  });

  it('adds the price of each chosen option to the total and snapshots it', async () => {
    const { service, created } = setup();

    const order = await service.create(
      dineInInput({
        items: [line({ quantity: 1, options: [{ groupId: 'g-1', optionId: 'o-1' }] })],
      }),
    );

    expect(created[0]?.items[0]?.options).toEqual([
      {
        kind: 'modifier',
        label: 'Tipo de leche',
        name: 'Almendra',
        priceDeltaClp: 500,
        referenceId: 'o-1',
      },
    ]);
    expect(order.totalClp).toBe(2500 + 500);
  });

  it('publishes order.created with the stored order', async () => {
    const { service, events } = setup();

    const order = await service.create(dineInInput());

    expect(events).toEqual([{ type: 'order.created', payload: order }]);
  });

  it('rejects an unavailable product with a field issue', async () => {
    const { service } = setup([{ ...capuchino, isAvailable: false }]);

    const error = await service.create(dineInInput()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('VALIDATION_ERROR');
    expect((error as AppError).issues).toEqual([
      { path: 'items.0.productId', message: '«Capuchino» no está disponible' },
    ]);
  });

  it('rejects a product that no longer exists', async () => {
    const { service } = setup([]);

    const error = await service.create(dineInInput()).catch((caught: unknown) => caught);

    expect((error as AppError).issues).toEqual([
      { path: 'items.0.productId', message: 'El producto ya no existe' },
    ]);
  });

  it('rejects an option that is sold out', async () => {
    const { service } = setup();

    const error = await service
      .create(dineInInput({ items: [line({ options: [{ groupId: 'g-1', optionId: 'o-2' }] })] }))
      .catch((caught: unknown) => caught);

    expect((error as AppError).issues).toEqual([
      { path: 'items.0.options.0', message: '«Sin lactosa» no está disponible' },
    ]);
  });

  it('rejects an option that does not belong to the product', async () => {
    const { service } = setup();

    const error = await service
      .create(dineInInput({ items: [line({ options: [{ groupId: 'g-1', optionId: 'ghost' }] })] }))
      .catch((caught: unknown) => caught);

    expect((error as AppError).issues).toEqual([
      { path: 'items.0.options.0', message: 'La personalización ya no existe' },
    ]);
  });

  it('requires a customer name for takeaway orders', async () => {
    const { service, created } = setup();

    const error = await service
      .create(dineInInput({ channel: 'takeaway', tableId: null, customerName: null }))
      .catch((caught: unknown) => caught);

    expect((error as AppError).issues).toEqual([
      { path: 'customerName', message: 'Un pedido para llevar requiere un nombre' },
    ]);
    expect(created).toHaveLength(0);
  });
});
