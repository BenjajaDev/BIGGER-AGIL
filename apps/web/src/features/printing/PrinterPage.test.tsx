import type { PrinterStatus, PrintJob } from '@bigger/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { mockFetch, renderRoute, type MockResponse } from '../../test/render';
import { PrinterIndicator } from './components/PrinterIndicator';
import { PrinterPage } from './PrinterPage';

const ORDER_ID = '0b8f7c6e-5d4c-4b3a-9f2e-1d0c9b8a7f6e';

const status = (overrides: Partial<PrinterStatus> = {}): PrinterStatus => ({
  enabled: true,
  device: 'COM5',
  codepage: 'cp858',
  columns: 32,
  pending: 0,
  failed: 0,
  lastPrintedAt: '2026-11-05T17:32:00.000Z',
  lastError: null,
  ...overrides,
});

const job = (overrides: Partial<PrintJob> = {}): PrintJob => ({
  id: '5d2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  kind: 'kitchen',
  orderId: ORDER_ID,
  label: 'Mesa 2',
  copy: 1,
  status: 'printed',
  attempts: 1,
  lastError: null,
  createdAt: '2026-11-05T17:32:00.000Z',
  printedAt: '2026-11-05T17:32:03.000Z',
  ...overrides,
});

function setup(
  current: PrinterStatus,
  jobs: PrintJob[] = [],
  onPost?: (path: string) => MockResponse,
) {
  return mockFetch((method, url) => {
    if (method === 'POST' && onPost) return onPost(url.pathname);
    if (url.pathname === '/api/v1/printer') return { body: { data: current } };
    if (url.pathname === '/api/v1/print-jobs') return { body: { data: jobs } };
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } };
  });
}

const route = { path: '/configuracion/impresora', route: '/configuracion/impresora' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PrinterPage', () => {
  it('explains how to turn the printer on and still shows how a comanda will look', async () => {
    setup(status({ enabled: false, device: null }));
    const { container } = renderRoute(<PrinterPage />, route);

    expect(
      await screen.findByRole('heading', { name: 'La impresión está desactivada' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/PRINTER_ENABLED=true/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hoja de prueba/ })).not.toBeInTheDocument();

    const preview = screen.getByRole('figure', { name: 'Vista previa de una comanda impresa' });
    expect(within(preview).getByText('MESA 2')).toBeInTheDocument();
    expect(within(preview).getByText('2 x CHACARERO')).toBeInTheDocument();
    expect(within(preview).getByText('1 x ARMA TU ENSALADA (Grande)')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('shows the device and sends the test sheet', async () => {
    const calls = setup(status(), [job()], () => ({
      body: { data: { printedAt: '2026-11-05T17:40:00.000Z' } },
    }));
    renderRoute(<PrinterPage />, route);

    expect(await screen.findByText('COM5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir hoja de prueba' }));

    expect(await screen.findByText(/Hoja enviada/)).toBeInTheDocument();
    expect(
      calls.some((call) => call.method === 'POST' && call.path === '/api/v1/printer/test'),
    ).toBe(true);
    expect(screen.getByRole('list', { name: '' })).toBeInTheDocument();
  });

  it('tells the cashier why the test sheet did not print', async () => {
    setup(status(), [], () => ({
      status: 503,
      body: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'La impresora no responde. Revisa que esté encendida y con papel.',
        },
      },
    }));
    renderRoute(<PrinterPage />, route);

    await userEvent.click(await screen.findByRole('button', { name: 'Imprimir hoja de prueba' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La impresora no responde');
  });

  it('lists failed comandas with their error and reprints one on demand', async () => {
    const calls = setup(
      status({ failed: 1, lastError: 'Sin papel.' }),
      [job({ status: 'failed', lastError: 'Sin papel.', printedAt: null })],
      () => ({ status: 202, body: { data: job({ copy: 2, status: 'pending', printedAt: null }) } }),
    );
    renderRoute(<PrinterPage />, route);

    expect(await screen.findByText('Impresora: 1 comanda sin imprimir')).toBeInTheDocument();
    expect(await screen.findByText(/Falló/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reimprimir comanda de Mesa 2' }));
    await waitFor(() => {
      expect(
        calls.some(
          (call) => call.method === 'POST' && call.path === `/api/v1/orders/${ORDER_ID}/print`,
        ),
      ).toBe(true);
    });
  });
});

describe('PrinterIndicator', () => {
  const indicator = { path: '/', route: '/' };

  it('stays out of the way while printing is off', async () => {
    const calls = setup(status({ enabled: false }));
    renderRoute(<PrinterIndicator />, indicator);
    await waitFor(() => {
      expect(calls.some((call) => call.path === '/api/v1/printer')).toBe(true);
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('warns with words, not only color, and links to the settings', async () => {
    setup(status({ failed: 2, lastError: 'Sin papel.' }));
    renderRoute(<PrinterIndicator />, indicator);

    const link = await screen.findByRole('link', { name: 'Impresora: 2 comandas sin imprimir' });
    expect(link).toHaveAttribute('href', '/configuracion/impresora');
  });

  it('keeps the «lista» wording for screen readers', async () => {
    setup(status());
    renderRoute(<PrinterIndicator />, indicator);
    expect(await screen.findByRole('link', { name: 'Impresora lista' })).toBeInTheDocument();
  });
});
