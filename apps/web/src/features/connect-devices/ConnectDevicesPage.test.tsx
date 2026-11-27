import type { SystemInfo } from '@bigger/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { mockFetch, renderRoute } from '../../test/render';
import { ConnectDevicesPage } from './ConnectDevicesPage';

const route = { path: '/configuracion/equipos', route: '/configuracion/equipos' };

function setup(info: SystemInfo) {
  mockFetch((_method, url) =>
    url.pathname === '/api/v1/admin/system/info'
      ? { body: { data: info } }
      : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ConnectDevicesPage', () => {
  it('shows each address with its QR, copies it and explains the steps', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    setup({
      version: '0.1.0',
      port: 3000,
      addresses: ['http://192.168.1.20:3000', 'http://10.0.0.5:3000'],
    });
    const { container } = renderRoute(<ConnectDevicesPage />, route);

    expect(await screen.findByText('http://192.168.1.20:3000')).toBeInTheDocument();
    expect(screen.getByText('http://10.0.0.5:3000')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Código QR para abrir http://192.168.1.20:3000' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Conecta la tablet o el celular al Wi-Fi del local.')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Copiar la dirección http://192.168.1.20:3000' }),
    );
    expect(writeText).toHaveBeenCalledWith('http://192.168.1.20:3000');
    expect(await screen.findByRole('button', { name: /Copiada/ })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('says so when the computer has no network', async () => {
    setup({ version: '0.1.0', port: 3000, addresses: [] });
    renderRoute(<ConnectDevicesPage />, route);
    expect(await screen.findByText('Este equipo no está conectado a una red')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar/ })).not.toBeInTheDocument();
  });
});
