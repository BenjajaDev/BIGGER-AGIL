import {
  Cake,
  Coffee,
  CupSoda,
  Salad,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

/**
 * Categories are created by the manager and have no icon in the database, so we map the common
 * slugs to an icon and fall back to a neutral one. Purely cosmetic: order taking never depends on it.
 */
const ICON_BY_SLUG: Readonly<Record<string, LucideIcon>> = {
  cafe: Coffee,
  cafes: Coffee,
  cafeteria: Coffee,
  sandwich: Sandwich,
  sandwiches: Sandwich,
  bocadillos: Sandwich,
  ensalada: Salad,
  ensaladas: Salad,
  frio: CupSoda,
  frios: CupSoda,
  bebida: CupSoda,
  bebidas: CupSoda,
  jugos: CupSoda,
  dulce: Cake,
  dulces: Cake,
  postre: Cake,
  postres: Cake,
  pasteleria: Cake,
};

export function categoryIcon(slug: string): LucideIcon {
  return ICON_BY_SLUG[slug] ?? UtensilsCrossed;
}
