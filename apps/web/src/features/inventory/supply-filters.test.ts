import type { Supply } from '@bigger/shared';
import { countFilters, matchesQuery, sortByUrgency } from './supply-filters';

const TODAY = '2026-11-27';
const make = (name: string, patch: Partial<Supply>): Supply => ({
  id: `00000000-0000-4000-8000-${String(name.length).padStart(12, '0')}`,
  name,
  unit: 'kg',
  minStock: 3,
  costPerUnitClp: 100,
  supplierId: null,
  supplierName: null,
  expiresOn: null,
  stock: 10,
  ...patch,
});

const supplies = [
  make('Tomate', {}),
  make('Palta', { expiresOn: '2026-11-28' }),
  make('Pan', { stock: 1 }),
  make('Leche', { expiresOn: '2026-11-14' }),
];

describe('supply filters', () => {
  it('counts each filter', () => {
    expect(countFilters(supplies, TODAY)).toEqual({ all: 4, reorder: 1, expiring: 1, expired: 1 });
  });

  it('sorts urgent first, then by name', () => {
    expect(sortByUrgency(supplies, TODAY).map((row) => row.supply.name)).toEqual([
      'Leche',
      'Palta',
      'Pan',
      'Tomate',
    ]);
  });

  it('searches without caring about case or accents', () => {
    expect(matchesQuery('Limón', 'limon')).toBe(true);
    expect(matchesQuery('Limón', 'pal')).toBe(false);
  });
});
