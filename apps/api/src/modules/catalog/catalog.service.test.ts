import type { Category, MenuProduct } from '@bigger/shared';
import { describe, expect, it } from 'vitest';
import type { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

const cafes: Category = { id: 'c-1', slug: 'cafes', name: 'Cafés', sortOrder: 0, image: null };
const helados: Category = {
  id: 'c-2',
  slug: 'helados',
  name: 'Helados',
  sortOrder: 1,
  image: null,
};
const capuchino: MenuProduct = {
  id: 'p-1',
  categoryId: cafes.id,
  typeId: null,
  kind: 'single',
  name: 'Capuchino',
  subtitle: '',
  description: '',
  priceClp: 2500,
  allergens: ['lacteos'],
  isAvailable: true,
  sortOrder: 0,
  image: null,
  sizes: [],
  promotion: null,
  modifierGroups: [],
  comboSlots: [],
};

function createService(products: MenuProduct[], now: string) {
  const repository: CatalogRepository = {
    listCategories: () => Promise.resolve([cafes, helados]),
    listProducts: (filter) =>
      Promise.resolve(products.filter((product) => !filter.onlyAvailable || product.isAvailable)),
  };
  return new CatalogService(repository, { timeZone: 'America/Santiago', now: () => new Date(now) });
}

describe('CatalogService.getPublicMenu', () => {
  it('groups available products by category and hides empty categories', async () => {
    const service = createService(
      [capuchino, { ...capuchino, id: 'p-2', name: 'Latte', isAvailable: false }],
      '2026-10-22T15:00:00Z',
    );

    const menu = await service.getPublicMenu();

    expect(menu.categories).toHaveLength(1);
    expect(menu.categories[0]?.slug).toBe('cafes');
    expect(menu.categories[0]?.products.map((product) => product.name)).toEqual(['Capuchino']);
  });

  it('lists running promotions first, using the shop calendar day', async () => {
    const promo = { ...capuchino, promotion: { startsOn: null, endsOn: '2026-10-21' } };
    // 02:00 UTC on the 22nd is still the 21st in Santiago: the promotion is still on.
    const lateNight = await createService([promo], '2026-10-22T02:00:00Z').getPublicMenu();
    expect(lateNight.promotions.map((product) => product.name)).toEqual(['Capuchino']);

    const nextDay = await createService([promo], '2026-10-22T15:00:00Z').getPublicMenu();
    expect(nextDay.promotions).toEqual([]);
    expect(nextDay.categories[0]?.products[0]?.promotion).toBeNull();
  });
});
