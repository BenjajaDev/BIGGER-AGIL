import type { Menu } from '@bigger/shared';
import { searchMenu } from './search-menu';

const menu: Menu = {
  categories: [
    {
      id: 'c-1',
      slug: 'pasteleria',
      name: 'Pastelería',
      sortOrder: 0,
      products: [
        {
          id: 'p-1',
          categoryId: 'c-1',
          name: 'Pie de limón',
          description: 'Base crocante y merengue.',
          priceClp: 3000,
          allergens: [],
          isAvailable: true,
          sortOrder: 0,
        },
        {
          id: 'p-2',
          categoryId: 'c-1',
          name: 'Brownie',
          description: 'Chocolate intenso.',
          priceClp: 2200,
          allergens: [],
          isAvailable: true,
          sortOrder: 1,
        },
      ],
    },
  ],
};

describe('searchMenu', () => {
  it('ignores accents and case', () => {
    expect(searchMenu(menu, 'LIMON').map((product) => product.name)).toEqual(['Pie de limón']);
  });

  it('matches descriptions too', () => {
    expect(searchMenu(menu, 'chocolate').map((product) => product.name)).toEqual(['Brownie']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchMenu(menu, '   ')).toEqual([]);
  });
});
