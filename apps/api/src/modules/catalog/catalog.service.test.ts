import type { Category, MenuProduct } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import type { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

const cafes: Category = { id: 'c-1', slug: 'cafes', name: 'Cafés', sortOrder: 0 };
const helados: Category = { id: 'c-2', slug: 'helados', name: 'Helados', sortOrder: 1 };
const capuchino: MenuProduct = {
  id: 'p-1',
  categoryId: cafes.id,
  kind: 'single',
  name: 'Capuchino',
  description: '',
  priceClp: 2500,
  allergens: ['lacteos'],
  isAvailable: true,
  sortOrder: 0,
  modifierGroups: [],
  comboSlots: [],
};

function createRepository(products: MenuProduct[]): CatalogRepository {
  return {
    listCategories: () => Promise.resolve([cafes, helados]),
    listProducts: (filter) =>
      Promise.resolve(products.filter((product) => !filter.onlyAvailable || product.isAvailable)),
  };
}

describe('CatalogService.getPublicMenu', () => {
  it('groups available products by category and hides empty categories', async () => {
    const service = new CatalogService(
      createRepository([capuchino, { ...capuchino, id: 'p-2', name: 'Latte', isAvailable: false }]),
    );

    const menu = await service.getPublicMenu();

    expect(menu.categories).toHaveLength(1);
    expect(menu.categories[0]?.slug).toBe('cafes');
    expect(menu.categories[0]?.products.map((product) => product.name)).toEqual(['Capuchino']);
  });
});
