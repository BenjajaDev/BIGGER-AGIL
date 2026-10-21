import type { AdminCategory, AdminModifierGroup, AdminProduct } from '@bigger/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { mockFetch, renderRoute } from '../../test/render';
import { ConfigLayout } from './ConfigLayout';
import { ModifierGroupEditorPage } from './ModifierGroupEditorPage';
import { ProductEditorPage } from './ProductEditorPage';

const SESSION_OK = { data: { authenticated: true, expiresAt: '2026-10-21T23:00:00.000Z' } };
const ids = {
  cafes: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  combos: '1c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  americano: '2c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  latte: '3c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
};

const category = (id: string, slug: string, name: string): AdminCategory => ({
  id,
  slug,
  name,
  sortOrder: 0,
  archivedAt: null,
  activeProductCount: 1,
});

const coffee = (id: string, name: string): AdminProduct => ({
  id,
  categoryId: ids.cafes,
  kind: 'single',
  name,
  description: '',
  priceClp: 2000,
  allergens: [],
  isAvailable: true,
  sortOrder: 0,
  archivedAt: null,
  modifierGroupIds: [],
  comboSlots: [],
});

const CATEGORIES = [
  category(ids.cafes, 'cafes', 'Cafés'),
  category(ids.combos, 'combos', 'Combos'),
];
const PRODUCTS = [coffee(ids.americano, 'Americano'), coffee(ids.latte, 'Latte')];
const GROUPS: AdminModifierGroup[] = [];

function catalogHandler(
  onWrite?: (method: string, path: string, body: unknown) => { status?: number; body: unknown },
) {
  return mockFetch((method, url, body) => {
    if (url.pathname.endsWith('/admin/session')) return { body: SESSION_OK };
    if (method !== 'GET' && onWrite) return onWrite(method, url.pathname, body);
    if (url.pathname.endsWith('/admin/categories')) return { body: { data: CATEGORIES } };
    if (url.pathname.endsWith('/admin/products')) return { body: { data: PRODUCTS } };
    if (url.pathname.endsWith('/admin/modifier-groups')) return { body: { data: GROUPS } };
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PIN gate', () => {
  it('asks for the PIN and shows a wrong PIN on the field itself', async () => {
    mockFetch((method) =>
      method === 'POST'
        ? { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'PIN incorrecto' } } }
        : { body: { data: { authenticated: false, expiresAt: null } } },
    );
    renderRoute(<ConfigLayout />, { path: '/configuracion', route: '/configuracion' });

    const pin = await screen.findByLabelText('PIN');
    await userEvent.type(pin, '1111');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('PIN incorrecto')).toBeInTheDocument();
    expect(pin).toHaveAttribute('aria-invalid', 'true');
    expect(pin).toHaveAccessibleDescription('PIN incorrecto');
  });
});

describe('modifier group editor', () => {
  it('explains the rule in plain language and blocks impossible rules', async () => {
    const calls = catalogHandler();
    renderRoute(<ModifierGroupEditorPage />, {
      path: '/configuracion/personalizaciones/nueva',
      route: '/configuracion/personalizaciones/nueva',
    });

    await userEvent.type(screen.getByLabelText('Nombre'), 'Extras');
    const max = screen.getByLabelText('Máximo a elegir');
    await userEvent.clear(max);
    await userEvent.type(max, '3');
    expect(screen.getByText('Opcional · se pueden elegir hasta 3 opciones')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Opción 1'), 'Crema');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('No puede permitir elegir más opciones de las que existen'),
    ).toBeInTheDocument();
    expect(max).toHaveAttribute('aria-invalid', 'true');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('sends a valid group to the API', async () => {
    const calls = catalogHandler((_method, _path, body) => ({
      status: 201,
      body: {
        data: {
          id: '9c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
          productCount: 0,
          ...(body as object),
          options: [],
        },
      },
    }));
    renderRoute(<ModifierGroupEditorPage />, {
      path: '/configuracion/personalizaciones/nueva',
      route: '/configuracion/personalizaciones/nueva',
    });

    await userEvent.type(screen.getByLabelText('Nombre'), 'Tipo de leche');
    await userEvent.type(screen.getByLabelText('Opción 1'), 'Entera');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar opción' }));
    await userEvent.type(screen.getByLabelText('Opción 2'), 'Vegetal');
    const extras = screen.getAllByLabelText('Suma al precio');
    await userEvent.clear(extras[1] as HTMLElement);
    await userEvent.type(extras[1] as HTMLElement, '500');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        name: 'Tipo de leche',
        minSelections: 0,
        maxSelections: 1,
        options: [
          { name: 'Entera', priceDeltaClp: 0, isAvailable: true },
          { name: 'Vegetal', priceDeltaClp: 500, isAvailable: true },
        ],
      });
    });
  });
});

describe('combo editor', () => {
  const route = { path: '/configuracion/combos/nuevo', route: '/configuracion/combos/nuevo' };

  it('suggests the Combos category and requires every field before saving', async () => {
    const calls = catalogHandler();
    renderRoute(<ProductEditorPage kind="combo" />, route);

    expect(await screen.findByLabelText('Categoría')).toHaveValue(ids.combos);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findAllByText('Escribe un nombre')).toHaveLength(2);
    expect(screen.getByLabelText('Producto 1')).toHaveAccessibleDescription('Elige un producto');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('builds a choice combo and maps server issues back to the right field', async () => {
    const calls = catalogHandler(() => ({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos enviados no son válidos',
          issues: [
            { path: 'comboSlots.0.options.1.productId', message: 'El producto ya no existe' },
          ],
        },
      },
    }));
    const { container } = renderRoute(<ProductEditorPage kind="combo" />, route);

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Desayuno');
    await userEvent.type(screen.getByLabelText('Precio'), '4500');
    await userEvent.type(screen.getByLabelText('Espacio 1'), 'Café a elección');
    await userEvent.selectOptions(screen.getByLabelText('Producto 1'), ids.americano);
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar producto a «Café a elección»' }),
    );
    await userEvent.selectOptions(screen.getByLabelText('Producto 2'), ids.latte);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
        kind: 'combo',
        categoryId: ids.combos,
        name: 'Desayuno',
        priceClp: 4500,
        comboSlots: [
          {
            name: 'Café a elección',
            options: [
              { productId: ids.americano, extraPriceClp: 0 },
              { productId: ids.latte, extraPriceClp: 0 },
            ],
          },
        ],
      });
    });

    expect(await screen.findByText('El producto ya no existe')).toBeInTheDocument();
    expect(screen.getByLabelText('Producto 2')).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(screen.getByRole('alert')).getByText('Revisa los campos marcados.'),
    ).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
