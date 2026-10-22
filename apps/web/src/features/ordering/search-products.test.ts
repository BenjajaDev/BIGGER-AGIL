import type { Product } from '@bigger/shared';
import { makeMenuProduct } from '../../test/fixtures';
import { searchProducts } from './search-products';

function product(overrides: Partial<Product>): Product {
  return makeMenuProduct({ name: 'Producto', priceClp: 1000, ...overrides });
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
