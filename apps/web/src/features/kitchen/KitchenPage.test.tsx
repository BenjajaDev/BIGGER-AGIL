import {
  KITCHEN_ORDER_STATUSES,
  type Order,
  type OrderStatus,
  type TableOverview,
} from '@bigger/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '../../app/query-client';
import { queryKeys } from '../../app/query-keys';
import { expectNoA11yViolations } from '../../test/a11y';
import { orderFixture as baseOrder } from '../../test/orders';
import { installKitchenDragGeometry } from '../../test/kitchen-drag';
import { WhatsAppOrdersPanel } from '../orders/components/WhatsAppOrdersPanel';
import { useTableOverview } from '../tables/useTableOverview';
import { KitchenPage } from './KitchenPage';

const preparingOrder: Order = {
  ...baseOrder,
  id: '1b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e',
  status: 'preparing',
  tableLabel: 'Mesa 5',
};
const readyOrder: Order = {
  ...baseOrder,
  id: '2b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e',
  status: 'ready',
  tableLabel: 'Mesa 8',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((finish, fail) => {
    resolve = finish;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** An isolated HTTP fake: production data and SQLite are never accessed. */
function setup(initialOrders: Order[] = [baseOrder, preparingOrder, readyOrder]) {
  let stored = initialOrders.map((order) => ({ ...order }));
  let patchHandler = (orderId: string, status: OrderStatus): Promise<Response> => {
    const updated = updateStored(orderId, status);
    return Promise.resolve(json({ data: updated }));
  };
  function updateStored(orderId: string, status: OrderStatus) {
    const current = stored.find((order) => order.id === orderId);
    if (!current) throw new Error('Unknown test order');
    const updated = { ...current, status, updatedAt: '2026-10-22T12:00:00.000Z' };
    stored = stored.map((order) => (order.id === orderId ? updated : order));
    return updated;
  }
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (init?.method === 'PATCH') {
      if (typeof init.body !== 'string') throw new Error('Expected a JSON request body');
      const body = JSON.parse(init.body) as { status: OrderStatus };
      const orderId = url.pathname.split('/').at(-2);
      if (!orderId) throw new Error('Missing test order ID');
      return patchHandler(orderId, body.status);
    }
    if (url.pathname === '/api/v1/orders') {
      const statuses = url.searchParams.get('status')?.split(',');
      const channel = url.searchParams.get('channel');
      return Promise.resolve(
        json({
          data: stored.filter(
            (order) =>
              (!statuses || statuses.includes(order.status)) &&
              (!channel || channel === order.channel),
          ),
        }),
      );
    }
    if (url.pathname === '/api/v1/tables') {
      const tableOrders = stored.filter((order) => order.channel === 'dine-in');
      const table: TableOverview = {
        id: baseOrder.tableId ?? '',
        number: 2,
        label: 'Mesa 2',
        sortOrder: 2,
        status: tableOrders.every((order) => order.status === 'delivered')
          ? 'awaiting-payment'
          : 'occupied',
        checkId: baseOrder.checkId,
        paidClp: 0,
        itemCount: 2,
        openTotalClp: 5000,
        balanceClp: 5000,
        openSince: baseOrder.createdAt,
      };
      return Promise.resolve(json({ data: [table] }));
    }
    throw new Error(`Unexpected HTTP request: ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const client = createQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const renderPage = (withOtherViews = false) =>
    render(
      <QueryClientProvider client={client}>
        <KitchenPage />
        {withOtherViews && (
          <>
            <TableProbe />
            <WhatsAppOrdersPanel now={new Date('2026-10-22T12:00:00.000Z')} />
          </>
        )}
      </QueryClientProvider>,
    );
  return {
    client,
    invalidate,
    fetchMock,
    renderPage,
    updateStored,
    setPatchHandler: (handler: typeof patchHandler) => {
      patchHandler = handler;
    },
    patchCalls: () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH'),
  };
}

function TableProbe() {
  const tables = useTableOverview();
  return <output aria-label="Estado de mesa">{tables.data?.[0]?.status}</output>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('KitchenPage drag and drop', () => {
  beforeEach(() => {
    installKitchenDragGeometry();
  });

  it('moves with the real keyboard sensor through the existing PATCH mutation', async () => {
    const app = setup([baseOrder]);
    app.renderPage();
    const handle = await screen.findByRole('button', { name: 'Arrastrar: Mesa 2' });
    const user = userEvent.setup();
    handle.focus();
    await user.keyboard(' ');
    const destination = screen.getByRole('region', { name: /En preparación/ });
    await waitFor(() => {
      expect(destination).toHaveClass('validDrop');
    });
    await waitFor(() => {
      expect(handle.closest('article')).toHaveClass('dragging');
    });
    await user.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(destination).toHaveClass('dropTarget');
    });
    await user.keyboard(' ');
    await waitFor(() => {
      expect(
        within(destination).getByRole('button', { name: 'Marcar listo: Mesa 2' }),
      ).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
    expect(app.patchCalls()[0]?.[1]?.body).toBe(JSON.stringify({ status: 'preparing' }));
  });

  it('moves with the real pointer sensor into an empty column', async () => {
    const app = setup([baseOrder]);
    app.renderPage();
    const handle = await screen.findByRole('button', { name: 'Arrastrar: Mesa 2' });
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 260,
      clientY: 90,
      button: 0,
      buttons: 1,
    });
    const destination = screen.getByRole('region', { name: /En preparación/ });
    await waitFor(() => {
      expect(destination).toHaveClass('validDrop');
    });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 470, clientY: 250, buttons: 1 });
    await waitFor(() => {
      expect(destination).toHaveClass('dropTarget');
    });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 470, clientY: 250, button: 0 });
    await waitFor(() => {
      expect(
        within(destination).getByRole('button', { name: 'Marcar listo: Mesa 2' }),
      ).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
  });

  async function startPointer(title = 'Mesa 2', pointerType = 'mouse') {
    const handle = await screen.findByRole('button', { name: `Arrastrar: ${title}` });
    const rect = handle.getBoundingClientRect();
    const column = handle.closest('section');
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType,
      clientX: rect.left + 20,
      clientY: rect.top + 20,
      button: 0,
      buttons: 1,
    });
    await waitFor(() => {
      expect(handle.closest('article')).toHaveClass('dragging');
    });
    return { handle, column };
  }

  async function movePointer(x: number, y = 250) {
    fireEvent.pointerMove(document, { pointerId: 1, clientX: x, clientY: y, buttons: 1 });
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  function releasePointer(x: number, y = 250) {
    fireEvent.pointerUp(document, { pointerId: 1, clientX: x, clientY: y, button: 0 });
  }

  it.each([
    ['new', 'preparing', 'Empezar', 470],
    ['preparing', 'ready', 'Marcar listo', 790],
  ] as const)(
    'keeps %s until the server confirms %s and invalidates all views',
    async (from, to, label, x) => {
      const app = setup([{ ...baseOrder, status: from }]);
      const pending = deferred<Response>();
      app.setPatchHandler(() => pending.promise);
      app.renderPage();
      const { column } = await startPointer();
      await movePointer(x);
      releasePointer(x);
      await waitFor(() => {
        expect(app.patchCalls()).toHaveLength(1);
      });
      const action = screen.getByRole('button', { name: `Guardando… ${label}: Mesa 2` });
      expect(action).toBeDisabled();
      expect(column).toContainElement(action);
      expect(
        app.client.getQueryData<Order[]>(
          queryKeys.orderList({ statuses: KITCHEN_ORDER_STATUSES }),
        )?.[0]?.status,
      ).toBe(from);
      await act(async () => {
        pending.resolve(json({ data: app.updateStored(baseOrder.id, to) }));
        await pending.promise;
      });
      const destination = document.querySelector(`[data-kitchen-status="${to}"]`);
      await waitFor(() => {
        expect(destination?.querySelector('[data-order-action]')).toBeEnabled();
      });
      expect(destination).toContainElement(screen.getByRole('article', { name: 'Mesa 2' }));
      expect(app.patchCalls()[0]?.[1]?.body).toBe(JSON.stringify({ status: to }));
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tables });
    },
  );

  it.each([
    ['new', 790],
    ['preparing', 150],
    ['new', 150],
    ['new', 1100],
  ] as const)('does not send HTTP for an invalid drop from %s at %s', async (from, x) => {
    const app = setup([{ ...baseOrder, status: from }]);
    app.renderPage();
    const { column } = await startPointer();
    await movePointer(x);
    releasePointer(x);
    await waitFor(() => {
      expect(screen.getByRole('article', { name: 'Mesa 2' })).not.toHaveClass('dragging');
    });
    expect(column).toContainElement(screen.getByRole('article', { name: 'Mesa 2' }));
    expect(app.patchCalls()).toHaveLength(0);
  });

  it('keeps ready orders available only through the delivery button', async () => {
    const app = setup([readyOrder]);
    app.renderPage();
    await screen.findByRole('button', { name: 'Entregado: Mesa 8' });
    expect(screen.queryByRole('button', { name: 'Arrastrar: Mesa 8' })).not.toBeInTheDocument();
    expect(app.patchCalls()).toHaveLength(0);
  });

  it('cancels with Escape and leaves the original order untouched', async () => {
    const app = setup([baseOrder]);
    app.renderPage();
    const { handle, column } = await startPointer();
    await movePointer(470);
    fireEvent.keyDown(handle, { key: 'Escape' });
    await waitFor(() => {
      expect(handle.closest('article')).not.toHaveClass('dragging');
    });
    expect(column).toContainElement(handle);
    expect(app.patchCalls()).toHaveLength(0);
  });

  it('handles touch input using the dedicated handle', async () => {
    const app = setup([baseOrder]);
    app.renderPage();
    await startPointer('Mesa 2', 'touch');
    await movePointer(470);
    releasePointer(470);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Marcar listo: Mesa 2' })).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
  });

  it.each(['network', 'conflict'] as const)(
    'reconciles the real server data after a %s failure',
    async (failure) => {
      const app = setup([baseOrder]);
      app.setPatchHandler((id) => {
        if (failure === 'network') return Promise.reject(new TypeError('Offline'));
        app.updateStored(id, 'ready');
        return Promise.resolve(
          json(
            { error: { code: 'CONFLICT', message: 'Pedido actualizado por otro dispositivo' } },
            409,
          ),
        );
      });
      app.renderPage();
      await startPointer();
      await movePointer(470);
      releasePointer(470);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        failure === 'network' ? 'No hay conexión' : 'El pedido cambió',
      );
      const actionName = failure === 'network' ? 'Empezar: Mesa 2' : 'Entregado: Mesa 2';
      await waitFor(() => {
        expect(screen.getByRole('button', { name: actionName })).toBeEnabled();
      });
      expect(app.patchCalls()).toHaveLength(1);
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tables });
    },
  );

  it('blocks duplicate drags and button actions on the pending order, while other orders work', async () => {
    const app = setup([baseOrder, preparingOrder]);
    const pending = deferred<Response>();
    app.setPatchHandler((id, status) =>
      id === baseOrder.id
        ? pending.promise
        : Promise.resolve(json({ data: app.updateStored(id, status) })),
    );
    app.renderPage();
    const { handle } = await startPointer();
    await movePointer(470);
    releasePointer(470);
    await waitFor(() => {
      expect(handle).toBeDisabled();
    });
    const action = screen.getByRole('button', { name: 'Guardando… Empezar: Mesa 2' });
    fireEvent.click(action);
    fireEvent.pointerDown(handle, { pointerId: 2, clientX: 260, clientY: 90, buttons: 1 });
    expect(app.patchCalls()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar listo: Mesa 5' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entregado: Mesa 5' })).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(2);
    await act(async () => {
      pending.resolve(json({ data: app.updateStored(baseOrder.id, 'preparing') }));
      await pending.promise;
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Marcar listo: Mesa 2' })).toBeEnabled();
    });
  });

  it.each(['ready', 'new'] as const)(
    'cancels if a remote update changes the state or version to %s during the gesture',
    async (status) => {
      const app = setup([baseOrder]);
      app.renderPage();
      await startPointer();
      app.updateStored(baseOrder.id, status);
      await act(async () => {
        await app.client.invalidateQueries({ queryKey: queryKeys.orders });
      });
      await waitFor(() => {
        expect(document.querySelector('[data-dnd-dragging]')).not.toBeInTheDocument();
      });
      releasePointer(470);
      expect(app.patchCalls()).toHaveLength(0);
      expect(
        screen.getByRole('button', {
          name: status === 'ready' ? 'Entregado: Mesa 2' : 'Empezar: Mesa 2',
        }),
      ).toBeEnabled();
    },
  );

  it('supports Enter and the down arrow from preparing to ready with keyboard cancellation', async () => {
    const app = setup([{ ...baseOrder, status: 'preparing' }]);
    app.renderPage();
    const handle = await screen.findByRole('button', { name: 'Arrastrar: Mesa 2' });
    const user = userEvent.setup();
    handle.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(handle.closest('article')).toHaveClass('dragging');
    });
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(handle.closest('article')).not.toHaveClass('dragging');
    });
    expect(app.patchCalls()).toHaveLength(0);
    handle.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(handle.closest('article')).toHaveClass('dragging');
    });
    await user.keyboard('{ArrowDown}');
    const column = screen.getByRole('region', { name: /Listos para entregar/ });
    await waitFor(() => {
      expect(column).toHaveClass('dropTarget');
    });
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(within(column).getByRole('button', { name: 'Entregado: Mesa 2' })).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
  });
});

describe('KitchenPage status actions', () => {
  it('shows the existing colored full-width buttons in their corresponding columns', async () => {
    const app = setup();
    app.renderPage();
    for (const [column, label, variant] of [
      ['Nuevos', 'Empezar: Mesa 2', 'primary'],
      ['En preparación', 'Marcar listo: Mesa 5', 'warning'],
      ['Listos para entregar', 'Entregado: Mesa 8', 'success'],
    ]) {
      const region = await screen.findByRole('region', { name: new RegExp(column ?? '') });
      const button = within(region).getByRole('button', { name: label });
      expect(button).toHaveClass(variant ?? '', 'fullWidth', 'lg');
    }
  });

  it.each([
    [baseOrder, 'Empezar', 'preparing', 'En preparación'],
    [preparingOrder, 'Marcar listo', 'ready', 'Listos para entregar'],
    [readyOrder, 'Entregado', 'delivered', null],
  ] as const)(
    'sends the correct PATCH for %s and renders only confirmed data',
    async (order, label, status, destination) => {
      const app = setup([order]);
      const pending = deferred<Response>();
      app.setPatchHandler(() => pending.promise);
      app.renderPage();
      const user = userEvent.setup();
      const button = await screen.findByRole('button', {
        name: `${label}: ${order.tableLabel ?? ''}`,
      });
      const originalColumn = button.closest('section');
      await user.click(button);

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(within(button).getByText('Guardando…')).toBeInTheDocument();
      expect(originalColumn).toContainElement(button);
      expect(app.patchCalls()).toHaveLength(1);
      const [url, options] = app.patchCalls()[0] ?? [];
      if (typeof url !== 'string') throw new Error('Expected a request URL string');
      expect(new URL(url).pathname).toBe(`/api/v1/orders/${order.id}/status`);
      expect(options?.body).toBe(JSON.stringify({ status }));
      expect(options?.headers).toMatchObject({ 'Content-Type': 'application/json' });

      await act(async () => {
        pending.resolve(json({ data: app.updateStored(order.id, status) }));
        await pending.promise;
      });

      if (destination) {
        const column = screen.getByRole('region', { name: new RegExp(destination) });
        await waitFor(() => {
          expect(
            within(column).getByRole('article', { name: order.tableLabel ?? '' }),
          ).toBeInTheDocument();
        });
        await waitFor(() => {
          expect(
            within(column).getByRole('button', { name: /^(Marcar listo|Entregado):/ }),
          ).toBeEnabled();
        });
        expect(
          within(column).getByRole('button', { name: /^(Marcar listo|Entregado):/ }),
        ).toHaveFocus();
      } else {
        await waitFor(() => {
          expect(
            screen.queryByRole('article', { name: order.tableLabel ?? '' }),
          ).not.toBeInTheDocument();
        });
        expect(screen.getByRole('heading', { name: 'Vista de cocina' })).toHaveFocus();
      }
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tables });
    },
  );

  it('blocks repeated actions for one order while another order stays operable', async () => {
    const app = setup();
    const first = deferred<Response>();
    const second = deferred<Response>();
    app.setPatchHandler((id) => (id === baseOrder.id ? first.promise : second.promise));
    app.renderPage();
    const button = await screen.findByRole('button', { name: 'Empezar: Mesa 2' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
    const otherButton = screen.getByRole('button', { name: 'Marcar listo: Mesa 5' });
    expect(otherButton).toBeEnabled();
    await userEvent.click(otherButton);
    expect(app.patchCalls()).toHaveLength(2);
    expect(otherButton).toBeDisabled();
    await act(async () => {
      first.resolve(json({ data: app.updateStored(baseOrder.id, 'preparing') }));
      second.resolve(json({ data: app.updateStored(preparingOrder.id, 'ready') }));
      await Promise.all([first.promise, second.promise]);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Marcar listo: Mesa 2' })).toBeEnabled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Entregado: Mesa 5' })).toBeEnabled();
    });
  });

  it.each(['CONFLICT', 'INVALID_STATE_TRANSITION'] as const)(
    'recovers the real server state after %s',
    async (code) => {
      const app = setup([baseOrder]);
      app.setPatchHandler((id) => {
        app.updateStored(id, 'ready');
        return Promise.resolve(
          json({ error: { code, message: 'Otro dispositivo cambió el pedido' } }, 409),
        );
      });
      app.renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'Empezar: Mesa 2' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El pedido cambió');
      const destination = screen.getByRole('region', { name: /Listos para entregar/ });
      await waitFor(() => {
        expect(
          within(destination).getByRole('button', { name: 'Entregado: Mesa 2' }),
        ).toBeEnabled();
      });
      expect(app.patchCalls()).toHaveLength(1);
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tables });
    },
  );

  it.each([404, 500])(
    'shows backend errors (%s), keeps the persisted state and does not retry PATCH',
    async (status) => {
      const app = setup([baseOrder]);
      // A PATCH must never inherit retries even if the app enables them globally later.
      app.client.setDefaultOptions({
        ...app.client.getDefaultOptions(),
        mutations: { retry: 3, retryDelay: 1 },
      });
      app.setPatchHandler(() =>
        Promise.resolve(
          json(
            {
              error: {
                code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
                message: 'No se pudo guardar el pedido',
              },
            },
            status,
          ),
        ),
      );
      app.renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'Empezar: Mesa 2' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el pedido');
      const column = screen.getByRole('region', { name: /Nuevos/ });
      await waitFor(() => {
        expect(within(column).getByRole('button', { name: 'Empezar: Mesa 2' })).toBeEnabled();
      });
      expect(app.patchCalls()).toHaveLength(1);
    },
  );

  it('reconciles a saved update even if the PATCH response is lost', async () => {
    const app = setup([baseOrder]);
    app.setPatchHandler((id) => {
      app.updateStored(id, 'preparing');
      return Promise.reject(new TypeError('Connection lost'));
    });
    app.renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Empezar: Mesa 2' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Marcar listo: Mesa 2' })).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
  });

  it.each(['{Enter}', ' '])('supports the keyboard with %s', async (key) => {
    const app = setup([baseOrder]);
    app.renderPage();
    const button = await screen.findByRole('button', { name: 'Empezar: Mesa 2' });
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Arrastrar: Mesa 2' })).toHaveFocus();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard(key);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Marcar listo: Mesa 2' })).toBeEnabled();
    });
    expect(app.patchCalls()).toHaveLength(1);
  });

  it('refreshes tables and WhatsApp with the same cache, keeping delivered orders unpaid', async () => {
    const whatsapp: Order = {
      ...preparingOrder,
      channel: 'whatsapp',
      tableId: null,
      tableLabel: null,
      customerName: 'Cliente de prueba',
    };
    const app = setup([{ ...baseOrder, status: 'ready' }, whatsapp]);
    app.renderPage(true);
    await waitFor(() => {
      expect(screen.getByLabelText('Estado de mesa')).toHaveTextContent('occupied');
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Entregado: Mesa 2' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Estado de mesa')).toHaveTextContent('awaiting-payment');
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar listo: WhatsApp · Cliente de prueba' }),
    );
    const panel = screen.getByRole('region', { name: 'Pedidos por WhatsApp' });
    await waitFor(() => {
      expect(within(panel).getByText('Listo')).toBeInTheDocument();
    });
    expect(app.patchCalls().map(([, init]) => init?.body)).toEqual([
      JSON.stringify({ status: 'delivered' }),
      JSON.stringify({ status: 'ready' }),
    ]);
    expect(
      app.client.getQueryState(queryKeys.orderList({ statuses: KITCHEN_ORDER_STATUSES }))
        ?.isInvalidated,
    ).toBe(false);
  });

  it('has no detectable structural accessibility violations', async () => {
    const app = setup();
    const { container } = app.renderPage();
    await screen.findByRole('button', { name: 'Empezar: Mesa 2' });
    await expectNoA11yViolations(container);
  });
});
