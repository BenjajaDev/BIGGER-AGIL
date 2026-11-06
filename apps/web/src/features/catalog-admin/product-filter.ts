import { promotionStatus, type AdminProduct } from '@bigger/shared';
import { normalizeText } from '../../lib/search-text';

export const PRODUCT_STATUS_FILTERS = ['all', 'available', 'sold-out', 'promotion'] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];

export const PRODUCT_STATUS_LABELS: Readonly<Record<ProductStatusFilter, string>> = {
  all: 'Todos',
  available: 'Disponibles',
  'sold-out': 'Agotados',
  promotion: 'En promoción',
};

export interface ProductFilter {
  query: string;
  /** `null` shows every category. */
  categoryId: string | null;
  status: ProductStatusFilter;
}

export const NO_FILTER: ProductFilter = { query: '', categoryId: null, status: 'all' };

export function isFiltering(filter: ProductFilter): boolean {
  return filter.query.trim() !== '' || filter.categoryId !== null || filter.status !== 'all';
}

function matchesStatus(product: AdminProduct, status: ProductStatusFilter, today: string): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'available':
      return product.isAvailable;
    case 'sold-out':
      return !product.isAvailable;
    case 'promotion':
      return promotionStatus(product.promotion, today) === 'active';
  }
}

/** Search by name, subtitle or description (accent-blind), by category and by state. */
export function filterProducts(
  products: readonly AdminProduct[],
  filter: ProductFilter,
  today: string,
): AdminProduct[] {
  const needle = normalizeText(filter.query);
  return products.filter(
    (product) =>
      (filter.categoryId === null || product.categoryId === filter.categoryId) &&
      matchesStatus(product, filter.status, today) &&
      (needle === '' ||
        normalizeText(`${product.name} ${product.subtitle} ${product.description}`).includes(
          needle,
        )),
  );
}
