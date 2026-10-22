import {
  resolveGroupRules,
  startingPrice,
  type ComboSlot,
  type MenuProduct,
  type ModifierGroup,
  type ProductSize,
} from '@bigger/shared';
import { formatClp, formatClpSpoken } from '../../lib/format';

const orList = new Intl.ListFormat('es', { type: 'disjunction' });
const andList = new Intl.ListFormat('es', { type: 'conjunction' });

function withExtra(name: string, extraClp: number): string {
  return extraClp > 0 ? `${name} (+${formatClp(extraClp)})` : name;
}

/** "1", "hasta 3", "1 a 3" — how many options a rule lets the customer choose. */
export function describeRuleRange(minSelections: number, maxSelections: number): string {
  if (minSelections === maxSelections) return String(maxSelections);
  if (minSelections === 0) return `hasta ${maxSelections}`;
  return `${minSelections} a ${maxSelections}`;
}

export interface PriceLabel {
  visual: string;
  spoken: string;
}

/** "$ 4.590", or "desde $ 2.500" when the price depends on the size. */
export function describePrice(product: Pick<MenuProduct, 'priceClp' | 'sizes'>): PriceLabel {
  const price = startingPrice(product);
  const from = product.sizes.length > 1 ? 'desde ' : '';
  return { visual: `${from}${formatClp(price)}`, spoken: `${from}${formatClpSpoken(price)}` };
}

/**
 * What a size includes: "Proteína: 1 · Vegetales: 4", or "Receta fija" when the size turns every
 * customization off ("Pequeña / Especial = precio y especificaciones fijas").
 */
export function describeSizeRules(
  groups: readonly ModifierGroup[],
  size: Pick<ProductSize, 'groupRules'>,
): string {
  if (groups.length === 0) return '';
  const rules = resolveGroupRules(groups, size);
  if (rules.length === 0) return 'Receta fija';
  return rules
    .map(
      (rule) => `${rule.group.name}: ${describeRuleRange(rule.minSelections, rule.maxSelections)}`,
    )
    .join(' · ');
}

/** "Churrasco (obligatorio): Luco o Italiano (+$ 900)" */
export function describeComboSlot(
  slot: Pick<ComboSlot, 'name' | 'isRequired' | 'options'>,
): string {
  const choices = slot.options.map((option) => withExtra(option.productName, option.extraPriceClp));
  return `${slot.name} (${slot.isRequired ? 'obligatorio' : 'opcional'}): ${orList.format(choices)}`;
}

/**
 * "Salsas (opcional, hasta 3): Mayonesa, Ketchup o Ají". With sizes the quantity depends on the
 * size (shown in the size table), so the group only says "según tamaño".
 */
export function describeModifierGroup(
  group: Pick<ModifierGroup, 'name' | 'minSelections' | 'maxSelections' | 'options'>,
  hasSizes = false,
): string {
  const rule = hasSizes
    ? 'según tamaño'
    : group.minSelections > 0
      ? `elige ${describeRuleRange(group.minSelections, group.maxSelections)}`
      : group.maxSelections > 1
        ? `opcional, hasta ${group.maxSelections}`
        : 'opcional';
  const choices = group.options.map((option) => withExtra(option.name, option.priceDeltaClp));
  const list = group.minSelections > 0 || hasSizes ? orList : andList;
  return `${group.name} (${rule}): ${list.format(choices)}`;
}
