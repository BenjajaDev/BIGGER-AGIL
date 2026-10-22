import type { ModifierGroup, ProductSize, Promotion } from './catalog.js';

export interface EffectiveGroupRule {
  group: ModifierGroup;
  minSelections: number;
  maxSelections: number;
}

/**
 * Customizations that apply to a size, with the size's overrides on top of each group's defaults.
 * Groups a size sets to `maxSelections = 0` are left out ("Mediano: sin proteína").
 */
export function resolveGroupRules(
  groups: readonly ModifierGroup[],
  size: Pick<ProductSize, 'groupRules'> | null,
): EffectiveGroupRule[] {
  return groups
    .map((group) => {
      const override = size?.groupRules.find((rule) => rule.groupId === group.id);
      return {
        group,
        minSelections: override?.minSelections ?? group.minSelections,
        maxSelections: override?.maxSelections ?? group.maxSelections,
      };
    })
    .filter((rule) => rule.maxSelections > 0);
}

/** Promotions are evaluated against the shop's calendar date (`YYYY-MM-DD` compares lexically). */
export function isPromotionActive(promotion: Promotion | null, today: string): boolean {
  if (!promotion) return false;
  if (promotion.startsOn && today < promotion.startsOn) return false;
  if (promotion.endsOn && today > promotion.endsOn) return false;
  return true;
}

export type PromotionStatus = 'none' | 'scheduled' | 'active' | 'expired';

export function promotionStatus(promotion: Promotion | null, today: string): PromotionStatus {
  if (!promotion) return 'none';
  if (promotion.startsOn && today < promotion.startsOn) return 'scheduled';
  if (promotion.endsOn && today > promotion.endsOn) return 'expired';
  return 'active';
}

/** Lowest price a customer can pay: the base price, or the cheapest size. */
export function startingPrice(product: {
  priceClp: number;
  sizes: readonly { priceClp: number }[];
}): number {
  return product.sizes.length > 0
    ? Math.min(...product.sizes.map((size) => size.priceClp))
    : product.priceClp;
}

/** Today's date in a given IANA time zone as `YYYY-MM-DD`. */
export function calendarDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
