import { describeSelectionRule } from './selection-rule';

describe('describeSelectionRule', () => {
  it.each([
    [0, 1, 'Opcional · se puede elegir 1 opción'],
    [0, 3, 'Opcional · se pueden elegir hasta 3 opciones'],
    [1, 1, 'Obligatorio · se elige exactamente 1 opción'],
    [2, 2, 'Obligatorio · se elige exactamente 2 opciones'],
    [1, 3, 'Obligatorio · se eligen entre 1 y 3 opciones'],
  ])('min %i, max %i → %s', (min, max, expected) => {
    expect(describeSelectionRule(min, max)).toBe(expected);
  });

  it('stays silent while the numbers are incomplete', () => {
    expect(describeSelectionRule(Number.NaN, 1)).toBe('');
  });
});
