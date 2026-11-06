import type { Product } from '@bigger/shared';
import { normalizeText } from '../../lib/search-text';

/** Accent-insensitive search so "capuchino" finds "Capuchino" and "limon" finds "Limón". */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = normalizeText(query);
  if (!needle) return [];
  return products.filter((product) =>
    normalizeText(`${product.name} ${product.description}`).includes(needle),
  );
}
