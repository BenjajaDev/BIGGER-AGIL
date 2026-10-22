import { describe, expect, it } from 'vitest';
import type { ModifierGroup } from './catalog.js';
import {
  calendarDate,
  isPromotionActive,
  promotionStatus,
  resolveGroupRules,
  startingPrice,
} from './product-rules.js';

const group = (id: string, minSelections: number, maxSelections: number): ModifierGroup => ({
  id,
  name: id,
  minSelections,
  maxSelections,
  options: [],
});

const proteina = group('proteina', 0, 2);
const vegetales = group('vegetales', 0, 5);

describe('resolveGroupRules', () => {
  it('uses each group default when there is no size', () => {
    expect(resolveGroupRules([proteina, vegetales], null).map((r) => r.maxSelections)).toEqual([
      2, 5,
    ]);
  });

  it('applies the size overrides: Grande = 1 proteína + 3 vegetales', () => {
    const rules = resolveGroupRules([proteina, vegetales], {
      groupRules: [
        { groupId: 'proteina', minSelections: 1, maxSelections: 1 },
        { groupId: 'vegetales', minSelections: 3, maxSelections: 3 },
      ],
    });
    expect(rules.map((r) => [r.group.id, r.minSelections, r.maxSelections])).toEqual([
      ['proteina', 1, 1],
      ['vegetales', 3, 3],
    ]);
  });

  it('drops groups the size disables: Mediano = sin proteína', () => {
    const rules = resolveGroupRules([proteina, vegetales], {
      groupRules: [{ groupId: 'proteina', minSelections: 0, maxSelections: 0 }],
    });
    expect(rules.map((r) => r.group.id)).toEqual(['vegetales']);
  });
});

describe('promotions', () => {
  const promo = { startsOn: '2026-10-01', endsOn: '2026-10-31' };

  it('is active only inside its dates, inclusive', () => {
    expect(isPromotionActive(promo, '2026-10-01')).toBe(true);
    expect(isPromotionActive(promo, '2026-10-31')).toBe(true);
    expect(isPromotionActive(promo, '2026-09-30')).toBe(false);
    expect(isPromotionActive(promo, '2026-11-01')).toBe(false);
  });

  it('treats missing dates as open-ended and no promotion as inactive', () => {
    expect(isPromotionActive({ startsOn: null, endsOn: null }, '2030-01-01')).toBe(true);
    expect(isPromotionActive(null, '2026-10-15')).toBe(false);
  });

  it('reports scheduled, active and expired', () => {
    expect(promotionStatus(promo, '2026-09-01')).toBe('scheduled');
    expect(promotionStatus(promo, '2026-10-10')).toBe('active');
    expect(promotionStatus(promo, '2026-12-01')).toBe('expired');
    expect(promotionStatus(null, '2026-12-01')).toBe('none');
  });
});

describe('startingPrice', () => {
  it('is the cheapest size, or the base price without sizes', () => {
    expect(startingPrice({ priceClp: 0, sizes: [{ priceClp: 6900 }, { priceClp: 3900 }] })).toBe(
      3900,
    );
    expect(startingPrice({ priceClp: 2500, sizes: [] })).toBe(2500);
  });
});

describe('calendarDate', () => {
  it('uses the shop time zone, not UTC', () => {
    // 02:00 UTC on Oct 22 is still Oct 21 in Santiago (UTC−3).
    expect(calendarDate(new Date('2026-10-22T02:00:00Z'), 'America/Santiago')).toBe('2026-10-21');
  });
});
