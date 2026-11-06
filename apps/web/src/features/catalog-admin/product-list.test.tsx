import type { AdminProduct } from '@bigger/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { makeAdminCategory, makeAdminProduct } from '../../test/fixtures';
import { mockFetch, renderRoute, type MockResponse } from '../../test/render';
import { ProductListPage } from './ProductListPage';

const CAFES = '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const PASTELES = '1c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const AMERICANO = '2c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';

const CATEGORIES = [
  makeAdminCategory({ id: CAFES, slug: 'cafes', name: 'Cafés' }),
  makeAdminCategory({ id: PASTELES, slug: 'pasteles', name: 'Pasteles' }),
];

function setup(onPatch?: (body: unknown) => MockResponse) {
  const products: AdminProduct[] = [
    makeAdminProduct({ id: AMERICANO, name: 'Americano', categoryId: CAFES }),
    makeAdminProduct({
      id: '3c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      name: 'Kuchen de limón',
      categoryId: PASTELES,
    }),
  ];
  const calls = mockFetch((method, url, body) => {
    if (method === 'PATCH') {
      if (onPatch) return onPatch(body);
      const { isAvailable } = body as { isAvailable: boolean };
      const target = products.find((product) => url.pathname.includes(product.id));
      if (target) target.isAvailable = isAvailable;
      return { body: { data: target } };
    }
    if (url.pathname.endsWith('/admin/products')) return { body: { data: products } };
    if (url.pathname.endsWith('/admin/categories')) return { body: { data: CATEGORIES } };
    return { body: { data: [] } };
  });
  const view = renderRoute(<ProductListPage kind="single" />, {
    path: '/configuracion/productos',
    route: '/configuracion/productos',
  });
  return { calls, ...view };
}

const patches = (calls: { method: string; path: string; body: unknown }[]) =>
  calls.filter((call) => call.method === 'PATCH');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProductListPage filters', () => {
  it('searches without caring about accents and says how many are shown', async () => {
    setup();
    await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });
    expect(screen.getByText('Mostrando 2 de 2')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'LIMON');
    expect(
      screen.getByRole('switch', { name: 'Agotado hoy: Kuchen de limón' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Agotado hoy: Americano' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 2')).toBeInTheDocument();
  });

  it('filters by category and offers to clear when nothing matches', async () => {
    setup();
    await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });

    const categories = within(screen.getByRole('group', { name: 'Filtrar por categoría' }));
    await userEvent.click(categories.getByRole('button', { name: 'Pasteles' }));
    expect(
      screen.queryByRole('switch', { name: 'Agotado hoy: Americano' }),
    ).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar producto' }), 'pizza');
    expect(screen.getByText('Ningún producto coincide')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(
      await screen.findByRole('switch', { name: 'Agotado hoy: Americano' }),
    ).toBeInTheDocument();
  });

  it('filters the sold-out products', async () => {
    setup();
    await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });
    await userEvent.click(screen.getByRole('switch', { name: 'Agotado hoy: Americano' }));
    await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });

    const states = within(screen.getByRole('group', { name: 'Filtrar por estado' }));
    await userEvent.click(states.getByRole('button', { name: 'Agotados' }));
    expect(screen.getByRole('switch', { name: 'Agotado hoy: Americano' })).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Agotado hoy: Kuchen de limón' }),
    ).not.toBeInTheDocument();
  });
});

describe('ProductListPage «Agotado hoy»', () => {
  it('marks a product sold out at once and lets the cashier undo it', async () => {
    const { calls } = setup();
    const toggle = await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    expect(await screen.findByText('«Americano» quedó agotado hoy')).toBeInTheDocument();
    expect(patches(calls)[0]).toMatchObject({
      path: `/api/v1/admin/products/${AMERICANO}/availability`,
      body: { isAvailable: false },
    });
    expect(screen.getByRole('switch', { name: 'Agotado hoy: Americano' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => {
      expect(patches(calls)[1]?.body).toEqual({ isAvailable: true });
    });
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Agotado hoy: Americano' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });
    expect(screen.queryByText('«Americano» quedó agotado hoy')).not.toBeInTheDocument();
  });

  it('goes back and says why when the server refuses', async () => {
    setup(() => ({
      status: 409,
      body: { error: { code: 'CONFLICT', message: 'Restaura el producto antes de cambiarlo' } },
    }));
    const toggle = await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });
    await userEvent.click(toggle);

    expect(await screen.findByText('Restaura el producto antes de cambiarlo')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Agotado hoy: Americano' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = setup();
    await screen.findByRole('switch', { name: 'Agotado hoy: Americano' });
    await expectNoA11yViolations(container);
  });
});
