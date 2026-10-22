import type { AdminModifierGroup, ProductType } from '@bigger/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '../../test/a11y';
import { makeAdminCategory, makeAdminProduct } from '../../test/fixtures';
import { mockFetch, renderRoute, type MockResponse } from '../../test/render';
import { ProductEditorPage } from './ProductEditorPage';
import { ProductListPage } from './ProductListPage';
import { ProductTypeEditorPage } from './ProductTypeEditorPage';

const ids = {
  ensaladas: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  pasteles: '1c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  proteina: '2c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  vegetales: '3c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  tipo: '4c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  nuevo: '5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
};

const group = (id: string, name: string, maxSelections: number): AdminModifierGroup => ({
  id,
  name,
  minSelections: 0,
  maxSelections,
  productCount: 1,
  options: Array.from({ length: maxSelections + 1 }, (_, index) => ({
    id: `${id.slice(0, -2)}${String(index).padStart(2, '0')}`,
    name: `${name} ${index + 1}`,
    priceDeltaClp: 0,
    isAvailable: true,
  })),
});

const CATEGORIES = [
  makeAdminCategory({ id: ids.ensaladas, slug: 'ensaladas', name: 'Ensaladas' }),
  makeAdminCategory({ id: ids.pasteles, slug: 'pasteles', name: 'Pasteles', sortOrder: 1 }),
];
const GROUPS = [group(ids.proteina, 'Proteína', 1), group(ids.vegetales, 'Vegetales', 4)];
const SALAD_TYPE: ProductType = {
  id: ids.tipo,
  name: 'Ensalada armable',
  description: 'Tamaño, proteína y vegetales',
  kind: 'single',
  sizes: [
    {
      name: 'Grande',
      priceClp: 4900,
      groupRules: [
        { groupId: ids.proteina, minSelections: 1, maxSelections: 1 },
        { groupId: ids.vegetales, minSelections: 4, maxSelections: 4 },
      ],
    },
    {
      name: 'Pequeña',
      priceClp: 2500,
      groupRules: [
        { groupId: ids.proteina, minSelections: 0, maxSelections: 0 },
        { groupId: ids.vegetales, minSelections: 3, maxSelections: 3 },
      ],
    },
  ],
  modifierGroupIds: [ids.proteina, ids.vegetales],
  comboSlots: [],
  productCount: 0,
};

function catalogHandler(
  onWrite: (body: unknown) => MockResponse = (body) => ({
    status: 201,
    body: { data: makeAdminProduct({ ...(body as object), id: ids.nuevo }) },
  }),
) {
  return mockFetch((method, url, body) => {
    if (method !== 'GET') return onWrite(body);
    if (url.pathname.endsWith('/admin/categories')) return { body: { data: CATEGORIES } };
    if (url.pathname.endsWith('/admin/products')) return { body: { data: [] } };
    if (url.pathname.endsWith('/admin/modifier-groups')) return { body: { data: GROUPS } };
    if (url.pathname.endsWith('/admin/product-types')) return { body: { data: [SALAD_TYPE] } };
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No encontrado' } } };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('new product from a type', () => {
  const route = { path: '/configuracion/productos/nuevo', route: '/configuracion/productos/nuevo' };

  it('asks what to add first, then pre-fills sizes and per-size rules from the template', async () => {
    const calls = catalogHandler();
    const { container } = renderRoute(<ProductEditorPage kind="single" />, route);

    await userEvent.click(await screen.findByRole('link', { name: /Ensalada armable/ }));

    expect(await screen.findByLabelText('Tamaño 1')).toHaveValue('Grande');
    expect(screen.getByLabelText('Tamaño 2')).toHaveValue('Pequeña');
    expect(screen.getByLabelText('Máximo de Proteína en Pequeña')).toHaveValue(0);
    const preview = screen.getByRole('complementary', { name: 'Así se verá en la carta' });
    expect(within(preview).getByText('Vegetales: 3')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nombre'), 'Arma tu ensalada');
    expect(within(preview).getByRole('article', { name: 'Arma tu ensalada' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), ids.ensaladas);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
        kind: 'single',
        typeId: ids.tipo,
        categoryId: ids.ensaladas,
        name: 'Arma tu ensalada',
        priceClp: null,
        modifierGroupIds: [ids.proteina, ids.vegetales],
        sizes: [
          { name: 'Grande', priceClp: 4900 },
          { name: 'Pequeña', priceClp: 2500 },
        ],
      });
    });
    await expectNoA11yViolations(container);
  });

  it('starts from a blank form and asks for a price when there are no sizes', async () => {
    const calls = catalogHandler();
    renderRoute(<ProductEditorPage kind="single" />, route);

    await userEvent.click(await screen.findByRole('link', { name: /Desde cero/ }));
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Pie de limón');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ingresa un precio o agrega tamaños')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });
});

describe('quick add', () => {
  it('creates a product with only name, category and price and keeps the category', async () => {
    const calls = catalogHandler();
    renderRoute(<ProductListPage kind="single" />, {
      path: '/configuracion/productos',
      route: '/configuracion/productos',
    });

    const form = await screen.findByRole('form', { name: 'Carga rápida' });
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Kuchen de nuez');
    await userEvent.selectOptions(within(form).getByLabelText('Categoría'), ids.pasteles);
    await userEvent.type(within(form).getByLabelText('Precio'), '2200');
    await userEvent.click(within(form).getByRole('button', { name: 'Agregar rápido' }));

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        kind: 'single',
        categoryId: ids.pasteles,
        typeId: null,
        name: 'Kuchen de nuez',
        subtitle: '',
        description: '',
        priceClp: 2200,
        isAvailable: true,
        image: null,
        promotion: null,
        sizes: [],
        allergens: [],
        modifierGroupIds: [],
      });
    });
    expect(await within(form).findByText(/Agregado «Kuchen de nuez»/)).toBeInTheDocument();
    expect(within(form).getByLabelText('Nombre')).toHaveValue('');
    expect(within(form).getByLabelText('Categoría')).toHaveValue(ids.pasteles);
  });
});

describe('product type editor', () => {
  it('saves a combo type with its slots and no sizes', async () => {
    const calls = catalogHandler((body) => ({
      status: 201,
      body: { data: { ...SALAD_TYPE, ...(body as object) } },
    }));
    renderRoute(<ProductTypeEditorPage />, {
      path: '/configuracion/tipos/nuevo',
      route: '/configuracion/tipos/nuevo',
    });

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Churrasco + pastel');
    await userEvent.selectOptions(screen.getByLabelText('Sirve para'), 'combo');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar espacio' }));
    await userEvent.type(screen.getByLabelText('Espacio 1'), 'Churrasco');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar espacio' }));
    await userEvent.type(screen.getByLabelText('Espacio 2'), 'Pastel');
    await userEvent.click(screen.getAllByLabelText('Obligatorio')[1] as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        name: 'Churrasco + pastel',
        description: '',
        kind: 'combo',
        sizes: [],
        modifierGroupIds: [],
        comboSlots: [
          { name: 'Churrasco', isRequired: true },
          { name: 'Pastel', isRequired: false },
        ],
      });
    });
  });
});
