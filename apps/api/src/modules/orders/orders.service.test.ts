import {
  ORDER_STATUSES,
  type CreateOrderInput,
  type ModifierGroup,
  type Order,
  type OrderStatus,
  type RealtimeEvent,
} from '@bigger/shared';
import { describe, expect, it, vi } from 'vitest';
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
    findById: vi.fn(() => Promise.resolve(null)),
    updateStatus: vi.fn(() => Promise.resolve(null)),
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
  return { service: new OrdersService(repository, publisher), repository, created, events };
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

const validTransitions: readonly (readonly [OrderStatus, OrderStatus])[] = [
  ['new', 'preparing'],
  ['new', 'cancelled'],
  ['preparing', 'ready'],
  ['preparing', 'cancelled'],
  ['ready', 'delivered'],
  ['delivered', 'paid'],
];

function setupStatus(status: OrderStatus = 'new') {
  const context = setup();
  const current = {
    ...fakeOrder({
      ...dineInInput(),
      pickupAt: null,
      totalClp: 5000,
      items: [
        {
          productId: capuchino.id,
          productName: capuchino.name,
          unitPriceClp: capuchino.priceClp,
          quantity: 2,
          quickNotes: [],
          note: null,
          options: [],
        },
      ],
    }),
    status,
  };
  const findById = vi.spyOn(context.repository, 'findById').mockResolvedValue(current);
  const updateStatus = vi.spyOn(context.repository, 'updateStatus');
  return { ...context, current, findById, updateStatus };
}

describe('OrdersService.updateStatus', () => {
  it.each(validTransitions)('allows %s → %s and publishes the stored result', async (from, to) => {
    const { service, current, updateStatus, events } = setupStatus(from);
    const stored = { ...current, status: to, updatedAt: '2026-10-22T12:01:00.000Z' };
    updateStatus.mockResolvedValue(stored);

    await expect(service.updateStatus(current.id, { status: to })).resolves.toEqual(stored);

    expect(updateStatus).toHaveBeenCalledExactlyOnceWith(current.id, from, to);
    expect(events).toEqual([{ type: 'order.updated', payload: stored }]);
  });

  const invalidTransitions = ORDER_STATUSES.flatMap((from) =>
    ORDER_STATUSES.filter(
      (to) =>
        !validTransitions.some(
          ([allowedFrom, allowedTo]) => from === allowedFrom && to === allowedTo,
        ),
    ).map((to) => [from, to] as const),
  );

  it.each(invalidTransitions)('rejects %s → %s without writing or publishing', async (from, to) => {
    const { service, current, updateStatus, events } = setupStatus(from);

    await expect(service.updateStatus(current.id, { status: to })).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 409,
    });

    expect(updateStatus).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('rejects a missing order without writing or publishing', async () => {
    const { service, current, findById, updateStatus, events } = setupStatus();
    findById.mockResolvedValue(null);

    await expect(service.updateStatus(current.id, { status: 'preparing' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(updateStatus).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('reports a conditional write conflict without retrying or publishing', async () => {
    const { service, current, updateStatus, events } = setupStatus();
    updateStatus.mockResolvedValue(null);

    await expect(service.updateStatus(current.id, { status: 'preparing' })).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
    expect(updateStatus).toHaveBeenCalledOnce();
    expect(events).toEqual([]);
  });

  it('does not publish while the write is pending', async () => {
    const { service, current, updateStatus, events } = setupStatus();
    let finishWrite!: (order: Order) => void;
    const pendingWrite = new Promise<Order>((resolve) => {
      finishWrite = resolve;
    });
    updateStatus.mockReturnValue(pendingWrite);

    const result = service.updateStatus(current.id, { status: 'preparing' });
    await Promise.resolve();
    expect(updateStatus).toHaveBeenCalledOnce();
    expect(events).toEqual([]);

    const stored = { ...current, status: 'preparing' as const };
    finishWrite(stored);
    await expect(result).resolves.toEqual(stored);
    expect(events).toEqual([{ type: 'order.updated', payload: stored }]);
  });

  it('does not publish when the database write fails', async () => {
    const { service, current, updateStatus, events } = setupStatus();
    const failure = new Error('SQLite write failed');
    updateStatus.mockRejectedValue(failure);

    await expect(service.updateStatus(current.id, { status: 'preparing' })).rejects.toBe(failure);
    expect(events).toEqual([]);
  });
});
