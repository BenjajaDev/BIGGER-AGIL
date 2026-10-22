import type { AdminCategory, AdminProduct, Category, MenuProduct } from '@bigger/shared';

/** Test data factories: one place to update when the catalog contracts grow. */
export function makeMenuProduct(overrides: Partial<MenuProduct> = {}): MenuProduct {
  return {
    id: '4f1c2b9e-7a1d-4c3e-9f8a-2b6d5e4c3a21',
    categoryId: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
    typeId: null,
    kind: 'single',
    name: 'Luco',
    subtitle: '',
    description: '',
    priceClp: 3990,
    allergens: [],
    isAvailable: true,
    sortOrder: 0,
    image: null,
    sizes: [],
    promotion: null,
    modifierGroups: [],
    comboSlots: [],
    ...overrides,
  };
}

export function makeAdminProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  const { modifierGroups, ...product } = makeMenuProduct();
  return {
    ...product,
    archivedAt: null,
    modifierGroupIds: modifierGroups.map((group) => group.id),
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
    slug: 'churrascos',
    name: 'Churrascos',
    sortOrder: 0,
    image: null,
    ...overrides,
  };
}

export function makeAdminCategory(overrides: Partial<AdminCategory> = {}): AdminCategory {
  return { ...makeCategory(), archivedAt: null, activeProductCount: 1, ...overrides };
}
