/** Spanish braille, grade 1 (uncontracted): letters, accents, ñ, ü, numbers, capitals, punctuation. */

type Dots = readonly number[];

function mask(dots: Dots): number {
  return dots.reduce((sum, dot) => sum + (1 << (dot - 1)), 0);
}

const LETTERS: Readonly<Record<string, Dots>> = {
  a: [1],
  b: [1, 2],
  c: [1, 4],
  d: [1, 4, 5],
  e: [1, 5],
  f: [1, 2, 4],
  g: [1, 2, 4, 5],
  h: [1, 2, 5],
  i: [2, 4],
  j: [2, 4, 5],
  k: [1, 3],
  l: [1, 2, 3],
  m: [1, 3, 4],
  n: [1, 3, 4, 5],
  o: [1, 3, 5],
  p: [1, 2, 3, 4],
  q: [1, 2, 3, 4, 5],
  r: [1, 2, 3, 5],
  s: [2, 3, 4],
  t: [2, 3, 4, 5],
  u: [1, 3, 6],
  v: [1, 2, 3, 6],
  w: [2, 4, 5, 6],
  x: [1, 3, 4, 6],
  y: [1, 3, 4, 5, 6],
  z: [1, 3, 5, 6],
  ñ: [1, 2, 4, 5, 6],
  á: [1, 2, 3, 5, 6],
  é: [2, 3, 4, 6],
  í: [3, 4],
  ó: [3, 4, 6],
  ú: [2, 3, 4, 5, 6],
  ü: [1, 2, 5, 6],
};

/** Digits reuse the letters a–j after the number sign. */
const DIGITS: Readonly<Record<string, string>> = {
  '1': 'a',
  '2': 'b',
  '3': 'c',
  '4': 'd',
  '5': 'e',
  '6': 'f',
  '7': 'g',
  '8': 'h',
  '9': 'i',
  '0': 'j',
};

const PUNCTUATION: Readonly<Record<string, Dots>> = {
  '.': [3],
  ',': [2],
  ';': [2, 3],
  ':': [2, 5],
  '-': [3, 6],
  '?': [2, 6],
  '¿': [2, 6],
  '!': [2, 3, 5],
  '¡': [2, 3, 5],
  '(': [2, 3, 6],
  ')': [3, 5, 6],
  '"': [2, 3, 6],
  '/': [3, 4],
  '+': [2, 3, 5],
  '&': [1, 2, 3, 4, 6],
};

const NUMBER_SIGN = mask([3, 4, 5, 6]);
const CAPITAL_SIGN = mask([4, 6]);

/** Translates text to braille cells (bit masks). Characters without a braille form are skipped. */
export function translateToBraille(text: string): number[] {
  const cells: number[] = [];
  let inNumber = false;
  for (const char of text.normalize('NFC')) {
    if (char === ' ') {
      cells.push(0);
      inNumber = false;
      continue;
    }
    const digit = DIGITS[char];
    if (digit !== undefined) {
      if (!inNumber) cells.push(NUMBER_SIGN);
      inNumber = true;
      const letter = LETTERS[digit];
      if (letter) cells.push(mask(letter));
      continue;
    }
    inNumber = false;
    const lower = char.toLocaleLowerCase('es');
    const letter = LETTERS[lower];
    if (letter) {
      if (lower !== char) cells.push(CAPITAL_SIGN);
      cells.push(mask(letter));
      continue;
    }
    const mark = PUNCTUATION[char];
    if (mark) cells.push(mask(mark));
  }
  return cells;
}
