import type { Menu, MenuProduct } from '@bigger/shared';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Accent-insensitive search so "limon" finds "Pie de limón". */
export function searchMenu(menu: Menu, query: string): MenuProduct[] {
  const needle = normalize(query);
  if (!needle) return [];
  return menu.categories
    .flatMap((category) => category.products)
    .filter((product) => normalize(`${product.name} ${product.description}`).includes(needle));
}
