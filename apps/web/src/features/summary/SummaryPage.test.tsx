import type { PrintJob } from '@bigger/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { buildOrder, buildTable } from '../../test/builders';
import { mockFetch, renderRoute } from '../../test/render';
import { SummaryPage } from './SummaryPage';

const printedJob: PrintJob = {
  id: '5d2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  kind: 'kitchen',
  orderId: '0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e',
  label: 'Mesa 2',
  copy: 1,
  status: 'printed',
  attempts: 1,
  lastError: null,
  createdAt: '2026-11-05T17:32:00.000Z',
  printedAt: '2026-11-05T17:32:03.000Z',
};

const tables = [
  buildTable({ number: 1 }),
  buildTable({ number: 2, status: 'occupied', openTotalClp: 5000, balanceClp: 5000 }),
  buildTable({ number: 3, status: 'awaiting-payment', openTotalClp: 8000, balanceClp: 3000 }),
];

function setup({ printerEnabled }: { printerEnabled: boolean }) {
  const calls = mockFetch((method, url) => {
    if (method === 'POST') return { status: 202, body: { data: printedJob } };
    switch (url.pathname) {
      case '/api/v1/tables':
        return { body: { data: tables } };
      case '/api/v1/orders':
        return { body: { data: [buildOrder({ status: 'ready', tableLabel: 'Mesa 2' })] } };
      case '/api/v1/printer':
        return {
          body: {
            data: {
              enabled: printerEnabled,
              device: printerEnabled ? 'COM5' : null,
              codepage: 'cp858',
              columns: 32,
              pending: 0,
              failed: 0,
              lastPrintedAt: null,
              lastError: null,
            },
          },
        };
      case '/api/v1/print-jobs':
        return { body: { data: [printedJob] } };
      default:
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } };
    }
  });
  const view = renderRoute(<SummaryPage />, { path: '/', route: '/' });
  return { calls, ...view };
}

describe('SummaryPage', () => {
  it('lists what needs attention first, each with its action', async () => {
    setup({ printerEnabled: false });
    const now = within(await screen.findByRole('region', { name: 'Ahora' }));
    expect(await now.findByText('Mesa 2 está listo')).toBeInTheDocument();
    expect(now.getByRole('link', { name: 'Cobrar' })).toHaveAttribute(
      'href',
      `/mesas/${tables[2]?.id}`,
    );
  });

  it('shows the live kitchen lanes and what is still to be charged', async () => {
    setup({ printerEnabled: false });
    const kitchen = within(await screen.findByRole('region', { name: 'Cocina en vivo' }));
    expect(await kitchen.findByText('Listo')).toBeInTheDocument();
    expect(kitchen.getAllByText('Sin pedidos')).toHaveLength(2);

    const progress = within(screen.getByRole('region', { name: 'En curso' }));
    expect(await progress.findByText('$ 8.000')).toBeInTheDocument();
    expect(progress.getByText('2 mesas')).toBeInTheDocument();
  });

  it('filters the map of tables', async () => {
    setup({ printerEnabled: false });
    const section = within(await screen.findByRole('region', { name: 'Mesas' }));
    expect(await section.findAllByRole('listitem')).not.toHaveLength(0);
    await userEvent.click(section.getByRole('button', { name: 'Por cobrar' }));
    expect(section.getByRole('button', { name: 'Por cobrar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(section.getByRole('link', { name: /Mesa 3/ })).toBeInTheDocument();
    expect(section.queryByRole('link', { name: /Mesa 1/ })).not.toBeInTheDocument();
  });

  it('offers to reprint the last comanda only while printing is on', async () => {
    const off = setup({ printerEnabled: false });
    await screen.findByRole('region', { name: 'Ahora' });
    expect(
      screen.queryByRole('region', { name: 'Última comanda impresa' }),
    ).not.toBeInTheDocument();
    off.unmount();

    const { calls } = setup({ printerEnabled: true });
    const last = within(await screen.findByRole('region', { name: 'Última comanda impresa' }));
    await userEvent.click(await last.findByRole('button', { name: /Reimprimir/ }));
    expect(calls.some((call) => call.method === 'POST' && call.path.endsWith('/print'))).toBe(true);
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = setup({ printerEnabled: true });
    await screen.findByRole('region', { name: 'Última comanda impresa' });
    await expectNoA11yViolations(container);
  });
});
