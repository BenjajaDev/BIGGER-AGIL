import { makeAdminProduct } from '../../test/fixtures';
import { filterProducts, isFiltering, NO_FILTER } from './product-filter';

const TODAY = '2026-11-05';
const CAFE = '11111111-1111-4111-8111-111111111111';
const PASTELERIA = '22222222-2222-4222-8222-222222222222';

const products = [
  makeAdminProduct({
    id: 'a1a1a1a1-0000-4000-8000-000000000001',
    name: 'Capuchino',
    categoryId: CAFE,
  }),
  makeAdminProduct({
    id: 'a1a1a1a1-0000-4000-8000-000000000002',
    name: 'Kuchen de limón',
    subtitle: 'Casero',
    categoryId: PASTELERIA,
    isAvailable: false,
  }),
  makeAdminProduct({
    id: 'a1a1a1a1-0000-4000-8000-000000000003',
    name: 'Pie de manzana',
    categoryId: PASTELERIA,
    promotion: { startsOn: '2026-11-01', endsOn: '2026-11-30' },
  }),
  makeAdminProduct({
    id: 'a1a1a1a1-0000-4000-8000-000000000004',
    name: 'Brownie',
    categoryId: PASTELERIA,
    promotion: { startsOn: '2026-12-01', endsOn: null },
  }),
];

const names = (filtered: readonly { name: string }[]) => filtered.map((product) => product.name);

describe('filterProducts', () => {
  it('shows everything when nothing is filtered', () => {
    expect(filterProducts(products, NO_FILTER, TODAY)).toHaveLength(4);
    expect(isFiltering(NO_FILTER)).toBe(false);
  });

  it('searches name and subtitle without caring about case or accents', () => {
    expect(names(filterProducts(products, { ...NO_FILTER, query: 'LIMON' }, TODAY))).toEqual([
      'Kuchen de limón',
    ]);
    expect(names(filterProducts(products, { ...NO_FILTER, query: 'casero' }, TODAY))).toEqual([
      'Kuchen de limón',
    ]);
    expect(filterProducts(products, { ...NO_FILTER, query: 'pizza' }, TODAY)).toEqual([]);
  });

  it('narrows by category and by state', () => {
    expect(names(filterProducts(products, { ...NO_FILTER, categoryId: CAFE }, TODAY))).toEqual([
      'Capuchino',
    ]);
    expect(names(filterProducts(products, { ...NO_FILTER, status: 'sold-out' }, TODAY))).toEqual([
      'Kuchen de limón',
    ]);
    expect(names(filterProducts(products, { ...NO_FILTER, status: 'available' }, TODAY))).toEqual([
      'Capuchino',
      'Pie de manzana',
      'Brownie',
    ]);
  });

  it('counts as «en promoción» only the promotions running today', () => {
    expect(names(filterProducts(products, { ...NO_FILTER, status: 'promotion' }, TODAY))).toEqual([
      'Pie de manzana',
    ]);
  });

  it('combines every criterion', () => {
    const filter = { query: 'pie', categoryId: PASTELERIA, status: 'promotion' as const };
    expect(names(filterProducts(products, filter, TODAY))).toEqual(['Pie de manzana']);
    expect(isFiltering(filter)).toBe(true);
  });
});
