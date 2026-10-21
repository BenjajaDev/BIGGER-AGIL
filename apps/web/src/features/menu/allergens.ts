import type { Allergen } from '@bigger/shared';

export const ALLERGEN_LABELS: Readonly<Record<Allergen, string>> = {
  gluten: 'Gluten',
  lacteos: 'Lácteos',
  huevo: 'Huevo',
  'frutos-secos': 'Frutos secos',
  soya: 'Soya',
};

/** Allergens are always spelled out in text, never shown only as icons. */
export function describeAllergens(allergens: readonly Allergen[]): string {
  return allergens.length === 0
    ? 'Sin alérgenos declarados'
    : `Contiene: ${allergens.map((allergen) => ALLERGEN_LABELS[allergen]).join(' · ')}`;
}
