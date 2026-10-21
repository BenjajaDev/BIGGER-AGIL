/** Plain-language summary of a customization's selection rule. */
export function describeSelectionRule(minSelections: number, maxSelections: number): string {
  if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections)) return '';
  const plural = (count: number) => `${count} ${count === 1 ? 'opción' : 'opciones'}`;
  if (minSelections === 0) {
    return maxSelections === 1
      ? 'Opcional · se puede elegir 1 opción'
      : `Opcional · se pueden elegir hasta ${plural(maxSelections)}`;
  }
  if (minSelections === maxSelections)
    return `Obligatorio · se elige exactamente ${plural(minSelections)}`;
  return `Obligatorio · se eligen entre ${minSelections} y ${maxSelections} opciones`;
}
