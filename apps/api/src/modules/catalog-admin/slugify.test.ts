import { describe, expect, it } from 'vitest';
import { sameName, slugify } from './slugify.js';

describe('slugify', () => {
  it.each([
    ['Sándwiches', 'sandwiches'],
    ['Bebidas y jugos', 'bebidas-y-jugos'],
    ['  Café & Té  ', 'cafe-te'],
    ['¡!', 'categoria'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('sameName', () => {
  it('ignores case and surrounding spaces, including accented capitals', () => {
    expect(sameName(' Café ', 'CAFÉ')).toBe(true);
    expect(sameName('Cafe', 'Café')).toBe(false);
  });
});
