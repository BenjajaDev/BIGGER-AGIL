/** 3 × 5 block letters for the raised category name that staff can read by sight. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '110', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '010', '001', '110'],
  '-': ['000', '000', '111', '000', '000'],
  '&': ['010', '101', '010', '101', '011'],
};

const GLYPH_COLUMNS = 3;

function baseLetter(char: string): string {
  return char
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();
}

/** Pixels (column, row) of a text, with one blank column between letters. */
export function textPixels(text: string): { pixels: [number, number][]; columns: number } {
  const pixels: [number, number][] = [];
  let column = 0;
  for (const char of text) {
    const glyph = GLYPHS[baseLetter(char)];
    if (glyph) {
      glyph.forEach((row, rowIndex) => {
        Array.from(row).forEach((bit, colIndex) => {
          if (bit === '1') pixels.push([column + colIndex, rowIndex]);
        });
      });
    }
    column += GLYPH_COLUMNS + 1;
  }
  return { pixels, columns: Math.max(column - 1, 0) };
}
