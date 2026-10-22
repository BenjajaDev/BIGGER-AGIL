import type { Product } from '@bigger/shared';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Accent-insensitive search so "capuchino" finds "Capuchino" and "limon" finds "Limón". */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = normalize(query);
  if (!needle) return [];
  return products.filter((product) =>
    normalize(`${product.name} ${product.description}`).includes(needle),
  );
}
