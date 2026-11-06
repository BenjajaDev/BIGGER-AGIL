import { normalizeText } from './search-text';

describe('normalizeText', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(normalizeText('  Limón  ')).toBe('limon');
    expect(normalizeText('ÑANDÚ')).toBe('nandu');
    expect(normalizeText('Crème Brûlée')).toBe('creme brulee');
  });
});
