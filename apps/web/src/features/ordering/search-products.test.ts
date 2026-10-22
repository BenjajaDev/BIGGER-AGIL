import type { Product } from '@bigger/shared';
import { searchProducts } from './search-products';

function product(overrides: Partial<Product>): Product {
  return {
    id: 'p-1',
    categoryId: 'c-1',
    kind: 'single',
    name: 'Producto',
    description: '',
    priceClp: 1000,
    allergens: [],
    isAvailable: true,
    sortOrder: 0,
    ...overrides,
  };
}

const capuchino = product({ id: 'p-1', name: 'Capuchino' });
const limonada = product({ id: 'p-2', name: 'Limonada', description: 'Con hierbabuena' });

describe('searchProducts', () => {
  it('returns nothing for an empty query', () => {
    expect(searchProducts([capuchino, limonada], '  ')).toEqual([]);
  });

  it('matches by name ignoring accents and case', () => {
    expect(searchProducts([capuchino, limonada], 'CAPU')).toEqual([capuchino]);
  });

  it('also matches the description', () => {
    expect(searchProducts([capuchino, limonada], 'hierba')).toEqual([limonada]);
  });
});
