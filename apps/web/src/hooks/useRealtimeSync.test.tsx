import { KITCHEN_ORDER_STATUSES, type Order, type TableOverview } from '@bigger/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createQueryClient } from '../app/query-client';
import { queryKeys } from '../app/query-keys';
import { useOrders } from '../features/orders/useOrders';
import { useTableOverview } from '../features/tables/useTableOverview';
import { orderFixture } from '../test/orders';
import { mockFetch } from '../test/render';
import { useRealtimeSync } from './useRealtimeSync';

class TestEventSource {
  static instances: TestEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  close = vi.fn();

  constructor(readonly url: string) {
    TestEventSource.instances.push(this);
  }

  open() {
    this.onopen?.();
  }
  disconnect() {
    this.onerror?.();
  }
  message(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

function SyncProbe() {
  const state = useRealtimeSync();
  const orders = useOrders({ statuses: KITCHEN_ORDER_STATUSES });
  const tables = useTableOverview();
  return (
    <>
      <output aria-label="Conexión">{state}</output>
      <output aria-label="Pedido">
        {orders.data ? (orders.data[0]?.status ?? 'sin pedidos') : ''}
      </output>
      <output aria-label="Mesa">{tables.data?.[0]?.status}</output>
    </>
  );
}

function setup() {
  TestEventSource.instances = [];
  vi.stubGlobal('EventSource', TestEventSource);
  let order: Order = { ...orderFixture };
  let tableStatus: TableOverview['status'] = 'occupied';
  const calls = mockFetch((_method, url) => {
    if (url.pathname === '/api/v1/orders') {
      const statuses = url.searchParams.get('status')?.split(',');
      return { body: { data: !statuses || statuses.includes(order.status) ? [order] : [] } };
    }
    if (url.pathname === '/api/v1/tables')
      return {
        body: {
          data: [
            {
              id: orderFixture.tableId,
              number: 2,
              label: 'Mesa 2',
              sortOrder: 2,
              status: tableStatus,
              checkId: orderFixture.checkId,
              itemCount: 2,
              openTotalClp: 5000,
              paidClp: 0,
              balanceClp: 5000,
              openSince: orderFixture.createdAt,
            },
          ],
        },
      };
    throw new Error(`Unexpected test request: ${url.pathname}`);
  });
  const client = createQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={client}>
      <SyncProbe />
    </QueryClientProvider>,
  );
  const source = TestEventSource.instances[0];
  if (!source) throw new Error('Missing SSE test connection');
  return {
    ...view,
    source,
    client,
    calls,
    invalidate,
    updateRemote: (
      status: Order['status'],
      nextTableStatus: TableOverview['status'] = 'occupied',
    ) => {
      order = { ...order, status };
      tableStatus = nextTableStatus;
      return order;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useRealtimeSync with EventSource', () => {
  it('does not duplicate the initial queries when SSE first opens', async () => {
    const app = setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('new');
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Mesa')).toHaveTextContent('occupied');
    });
    act(() => {
      app.source.open();
      app.source.open();
    });

    expect(screen.getByLabelText('Conexión')).toHaveTextContent('open');
    expect(app.calls).toHaveLength(2);
    expect(app.invalidate).not.toHaveBeenCalled();
    expect(new URL(app.source.url).pathname).toBe('/api/v1/events');
  });

  it.each(['order.created', 'order.updated'] as const)(
    'refreshes all order lists and tables for %s',
    async (type) => {
      const app = setup();
      await waitFor(() => {
        expect(screen.getByLabelText('Pedido')).toHaveTextContent('new');
      });
      const remote = app.updateRemote('ready');
      act(() => {
        app.source.message(JSON.stringify({ type, payload: remote }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Pedido')).toHaveTextContent('ready');
      });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
      expect(app.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tables });
    },
  );

  it('recovers missed changes on reconnection and refreshes only once per reopening', async () => {
    const app = setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('new');
    });
    act(() => {
      app.source.open();
      app.source.disconnect();
    });
    expect(screen.getByLabelText('Conexión')).toHaveTextContent('reconnecting');
    app.updateRemote('delivered', 'awaiting-payment');
    act(() => {
      app.source.disconnect();
      app.source.open();
      app.source.open();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('sin pedidos');
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Mesa')).toHaveTextContent('awaiting-payment');
    });
    expect(app.invalidate.mock.calls).toEqual([
      [{ queryKey: queryKeys.orders }],
      [{ queryKey: queryKeys.tables }],
    ]);
    expect(app.calls).toHaveLength(4);
    expect(TestEventSource.instances).toHaveLength(1);
  });

  it('also recovers after the first connection attempt fails', async () => {
    const app = setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('new');
    });
    app.updateRemote('preparing');
    act(() => {
      app.source.disconnect();
      app.source.open();
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('preparing');
    });
  });

  it('ignores malformed and invalid events and preserves catalog invalidation', async () => {
    const app = setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Pedido')).toHaveTextContent('new');
    });
    act(() => {
      app.source.message('not JSON');
      app.source.message(JSON.stringify({ type: 'order.updated', payload: { status: 'ready' } }));
    });
    expect(app.invalidate).not.toHaveBeenCalled();
    act(() => {
      app.source.message(JSON.stringify({ type: 'catalog.updated' }));
    });
    expect(app.invalidate.mock.calls).toEqual([
      [{ queryKey: queryKeys.catalog }],
      [{ queryKey: queryKeys.admin }],
    ]);
  });

  it('closes the stream when the app shell unmounts', () => {
    const app = setup();
    app.unmount();
    expect(app.source.close).toHaveBeenCalledOnce();
  });
});
