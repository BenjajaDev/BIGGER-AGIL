import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createQueryClient } from '../../app/query-client';
import { expectNoA11yViolations } from '../../test/a11y';
import { buildOrder, buildTable } from '../../test/builders';
import { mockFetch } from '../../test/render';
import { AppShell } from './AppShell';

vi.mock('../../hooks/useRealtimeSync', () => ({ useRealtimeSync: () => 'open' }));

function setup(route: string) {
  mockFetch((_method, url) => {
    if (url.pathname === '/api/v1/tables') {
      return {
        body: {
          data: [
            buildTable({ number: 1, status: 'awaiting-payment' }),
            buildTable({ number: 2, status: 'awaiting-payment' }),
            buildTable({ number: 3 }),
          ],
        },
      };
    }
    if (url.pathname === '/api/v1/orders') return { body: { data: [buildOrder()] } };
    if (url.pathname === '/api/v1/printer') {
      return {
        body: {
          data: {
            enabled: false,
            device: null,
            codepage: 'cp858',
            columns: 32,
            pending: 0,
            failed: 0,
            lastPrintedAt: null,
            lastError: null,
          },
        },
      };
    }
    return { body: { data: [] } };
  });
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<p>Contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell navigation', () => {
  it('shows the tabs of Operación and marks the current one', async () => {
    setup('/mesas');
    const tabs = within(await screen.findByRole('navigation', { name: 'Operación' }));
    expect(tabs.getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Resumen'),
      expect.stringContaining('Mesas'),
      expect.stringContaining('Pedido'),
      expect.stringContaining('Cocina'),
    ]);
    expect(tabs.getByRole('link', { name: /^Mesas/ })).toHaveAttribute('aria-current', 'page');
    expect(
      within(screen.getByRole('navigation', { name: 'Áreas' })).getByRole('link', {
        name: 'Operación',
      }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('switches to the Gestión tabs on its routes', async () => {
    setup('/reportes');
    const tabs = within(await screen.findByRole('navigation', { name: 'Gestión' }));
    expect(tabs.getByRole('link', { name: /^Reportes/ })).toHaveAttribute('aria-current', 'page');
    expect(tabs.getByRole('link', { name: /^Carta y ajustes/ })).toBeInTheDocument();
  });

  it('counts tables to charge and new orders, in numbers and in words', async () => {
    setup('/');
    const tabs = within(await screen.findByRole('navigation', { name: 'Operación' }));
    expect(await tabs.findByRole('link', { name: /2 mesas por cobrar/ })).toBeInTheDocument();
    expect(await tabs.findByRole('link', { name: /1 pedido nuevo/ })).toBeInTheDocument();
  });

  it('keeps «+ Pedido» in the middle of the phone bar and opens Gestión from «Más»', async () => {
    setup('/mesas');
    const bar = within(await screen.findByRole('navigation', { name: 'Navegación principal' }));
    expect(bar.getByRole('link', { name: 'Pedido' })).toHaveAttribute('href', '/pedido');
    expect(bar.getByRole('link', { name: /^Resumen/ })).toBeInTheDocument();

    await userEvent.click(bar.getByRole('button', { name: 'Más' }));
    const sheet = within(screen.getByRole('dialog', { name: 'Gestión' }));
    expect(sheet.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/configuracion',
      '/bodega',
      '/compras',
      '/reportes',
      '/clientes',
    ]);
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = setup('/mesas');
    await screen.findByRole('navigation', { name: 'Operación' });
    await expectNoA11yViolations(container);
  });
});
