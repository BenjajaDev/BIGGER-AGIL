import {
  cellsPerLine,
  linesPerPlate,
  startingPrice,
  type BrailleLine,
  type BraillePlate,
  type Menu,
} from '@bigger/shared';
import { translateToBraille } from './braille-es.js';

/** Braille lines are not wrapped by hyphenating: words move whole to the next line. */
function wrapWords(words: readonly string[], width: number): string[] {
  const lines: string[] = [];
  let current = '';
  const length = (text: string) => translateToBraille(text).length;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (length(candidate) <= width || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type MenuCategory = Menu['categories'][number];
type MenuProduct = MenuCategory['products'][number];

/** «Capuchino 2500»: no thousands dot and no currency sign; each plate says «Precios en pesos». */
export function productLine(product: MenuProduct): string {
  const from = product.sizes.length > 1 ? 'desde ' : '';
  return `${product.name} ${from}${String(startingPrice(product))}`;
}

function toLine(text: string): BrailleLine {
  return { text, cells: translateToBraille(text) };
}

function slugOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** One plate per category; a category with more lines than fit continues on a numbered plate. */
export function buildBraillePlates(categories: readonly MenuCategory[]): BraillePlate[] {
  const width = cellsPerLine();
  const capacity = linesPerPlate() - 2; // category name and «Precios en pesos»
  const plates: BraillePlate[] = [];
  for (const category of categories) {
    const productLines = category.products.flatMap((product) =>
      wrapWords(productLine(product).split(' '), width).map(toLine),
    );
    if (productLines.length === 0) continue;
    const parts = Math.ceil(productLines.length / capacity);
    for (let part = 1; part <= parts; part += 1) {
      const chunk = productLines.slice((part - 1) * capacity, part * capacity);
      const name = parts > 1 ? `${category.name} ${String(part)}` : category.name;
      plates.push({
        id: `${slugOf(category.name)}-${String(part)}`,
        categoryId: category.id,
        categoryName: category.name,
        part,
        parts,
        titleText: category.name.toLocaleUpperCase('es'),
        lines: [
          toLine(wrapWords(name.split(' '), width)[0] ?? name),
          toLine('Precios en pesos'),
          ...chunk,
        ],
      });
    }
  }
  return plates;
}
