import { summarizeCheck, type Check, type Order } from '@bigger/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { orderFixture } from '../../test/orders';
import { mockFetch, renderRoute } from '../../test/render';
import { TableCheckPage } from './TableCheckPage';

const tableId = orderFixture.tableId ?? '';
const route = { path: '/mesas/:tableId', route: `/mesas/${tableId}` };

const juan: Order = { ...orderFixture, customerName: 'Juan' };
const [capuchino] = orderFixture.items;
if (!capuchino) throw new Error('El pedido de prueba no tiene líneas');
const ana: Order = {
  ...orderFixture,
  id: '2b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e',
  customerName: 'Ana',
  items: [
    {
      ...capuchino,
      id: '3c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      productName: 'Pie limón',
      unitPriceClp: 1300,
      quantity: 1,
    },
  ],
  totalClp: 1300,
};

function buildCheck(overrides: Partial<Pick<Check, 'payments' | 'status'>> = {}): Check {
  const orders = [juan, ana];
  const payments = overrides.payments ?? [];
  return {
    id: orderFixture.checkId,
    tableId,
    tableLabel: 'Mesa 2',
    status: overrides.status ?? 'open',
    version: payments.length,
    splitParts: null,
    orders,
    payments,
    ...summarizeCheck(orders, payments, { parts: null, paidParts: 0 }),
    openedAt: orderFixture.createdAt,
    closedAt: null,
  };
}

function setup(check: Check | null = buildCheck()) {
  return mockFetch((method, url, body) => {
    if (method === 'GET' && url.pathname === `/api/v1/tables/${tableId}/check`) {
      return check
        ? { body: { data: check } }
        : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Sin cuenta' } } };
    }
    if (method === 'POST' && url.pathname.endsWith('/payments')) {
      const input = body as { items?: { orderItemId: string; quantity: number }[]; tipClp: number };
      const paid = buildCheck({
        payments: [
          {
            id: '5d2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
            method: 'debit',
            mode: 'items',
            amountClp: 1300,
            tipClp: input.tipClp,
            receivedClp: null,
            changeClp: null,
            items: (input.items ?? []).map((item) => ({ ...item, amountClp: 1300 })),
            createdAt: '2026-10-21T12:10:00.000Z',
            voidedAt: null,
            voidReason: null,
          },
        ],
      });
      return { status: 201, body: { data: paid } };
    }
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TableCheckPage', () => {
  it('shows what each person ordered, the balance and the actions', async () => {
    setup();
    const { container } = renderRoute(<TableCheckPage />, route);

    expect(await screen.findByRole('heading', { name: 'Cuenta · Mesa 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Juan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
    const summary = screen.getByRole('complementary', { name: 'Resumen de la cuenta' });
    expect(within(summary).getByText('Saldo').nextSibling).toHaveTextContent('6.300');
    expect(screen.getByRole('link', { name: 'Agregar pedido' })).toHaveAttribute(
      'href',
      `/pedido?mesa=${tableId}`,
    );
    await expectNoA11yViolations(container);
  });

  it('lets Ana pay only her items with debit and confirms the payment', async () => {
    const calls = setup();
    renderRoute(<TableCheckPage />, route);
    await userEvent.click(await screen.findByRole('button', { name: 'Cobrar' }));

    const dialog = screen.getByRole('dialog', { name: 'Cobrar Mesa 2' });
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Por productos' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Todo lo de Ana' }));
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Débito' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Agregar propina/ }));
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Cobrar \$\s1\.300 con Débito$/ }),
    );

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        mode: 'items',
        method: 'debit',
        tipClp: 0,
        receivedClp: null,
        expectedAmountClp: 1300,
        items: [{ orderItemId: ana.items[0]?.id, quantity: 1 }],
      });
    });
    expect(await within(dialog).findByText(/Pago registrado/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Queda un saldo de/)).toBeInTheDocument();
  });

  it('computes the change in cash and blocks charging until enough is received', async () => {
    setup();
    renderRoute(<TableCheckPage />, route);
    await userEvent.click(await screen.findByRole('button', { name: 'Cobrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Cobrar Mesa 2' });

    await userEvent.click(within(dialog).getByRole('radio', { name: 'Efectivo' }));
    const charge = within(dialog).getByRole('button', { name: /^Cobrar \$\s6\.930 con Efectivo$/ });
    expect(charge).toBeDisabled();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Ingresa cuánto recibes');

    await userEvent.type(within(dialog).getByLabelText('Recibido en efectivo'), '10000');
    expect(charge).toBeEnabled();
    expect(within(dialog).getByText('Vuelto').nextSibling).toHaveTextContent('3.070');
  });

  it('says the table is free when it has no open check', async () => {
    setup(null);
    renderRoute(<TableCheckPage />, route);
    expect(await screen.findByText('La mesa está libre')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tomar pedido' })).toHaveAttribute(
      'href',
      `/pedido?mesa=${tableId}`,
    );
  });
});
