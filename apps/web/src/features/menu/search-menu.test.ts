import type { Menu } from '@bigger/shared';
import { makeCategory, makeMenuProduct } from '../../test/fixtures';
import { searchMenu } from './search-menu';

const menu: Menu = {
  promotions: [],
  categories: [
    {
      ...makeCategory({ slug: 'pasteles', name: 'Pasteles' }),
      products: [
        makeMenuProduct({ id: 'p-1', name: 'Pie limón', description: 'Base crocante y merengue.' }),
        makeMenuProduct({ id: 'p-2', name: 'Roll canela', description: 'Glaseado de vainilla.' }),
      ],
    },
  ],
};

describe('searchMenu', () => {
  it('ignores accents and case', () => {
    expect(searchMenu(menu, 'LIMON').map((product) => product.name)).toEqual(['Pie limón']);
  });

  it('matches descriptions too', () => {
    expect(searchMenu(menu, 'vainilla').map((product) => product.name)).toEqual(['Roll canela']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchMenu(menu, '   ')).toEqual([]);
  });
});
