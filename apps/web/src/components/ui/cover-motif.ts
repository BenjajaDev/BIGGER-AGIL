import {
  Beef,
  CakeSlice,
  Cookie,
  Croissant,
  Drumstick,
  Fish,
  Leaf,
  type LucideIcon,
  Salad,
  Sandwich,
  UtensilsCrossed,
} from 'lucide-react';

export type CoverTone = 'terracota' | 'salvia' | 'ambar' | 'carbon';

export interface CoverMotif {
  icon: LucideIcon;
  tone: CoverTone;
}

/** First match wins, so the specific words go before the general ones. */
const MOTIFS: readonly (readonly [RegExp, CoverMotif])[] = [
  [/vegetarian|verdura/, { icon: Leaf, tone: 'salvia' }],
  [/ensalada|césar|cesar/, { icon: Salad, tone: 'salvia' }],
  [/marina|atún|atun/, { icon: Fish, tone: 'salvia' }],
  [/pollo/, { icon: Drumstick, tone: 'ambar' }],
  [/cookie|galleta|cuchufl/, { icon: Cookie, tone: 'ambar' }],
  [/media luna|factura|muffin|queque/, { icon: Croissant, tone: 'ambar' }],
  [/pastel|kuchen|pie|cheesecake|roll|torta/, { icon: CakeSlice, tone: 'carbon' }],
  [
    /churrasc|vacuno|lomo|carne|chacarer|italian|luco|chemilico|chilen|american|granjer/,
    { icon: Beef, tone: 'terracota' },
  ],
  [/sándwich|sandwich|napolitan|jamón|jamon|quesillo/, { icon: Sandwich, tone: 'terracota' }],
];

const FALLBACK: CoverMotif = { icon: UtensilsCrossed, tone: 'carbon' };

/** Illustration for a card with no photo yet, picked from the product or category name. */
export function coverMotif(label: string | undefined): CoverMotif {
  if (!label) return FALLBACK;
  const text = label.toLocaleLowerCase('es-CL');
  return MOTIFS.find(([pattern]) => pattern.test(text))?.[1] ?? FALLBACK;
}
